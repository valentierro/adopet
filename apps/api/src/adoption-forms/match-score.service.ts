import { Injectable } from '@nestjs/common';
import type {
  ScoringConfig,
  SnapshotQuestion,
  MatchScoreBreakdownItem,
  MatchScoreResult,
} from './match-score.types';

/** Tipos de pergunta que suportam scoring automático */
const SCORABLE_TYPES = ['CHECKBOX', 'SELECT_SINGLE', 'SELECT_MULTIPLE', 'NUMBER'] as const;

/** Pontuação máxima por pergunta (escala 0-10) */
const MAX_POINTS_PER_QUESTION = 10;

@Injectable()
export class MatchScoreService {
  /**
   * Calcula o Match Score a partir do snapshot do template e respostas.
   * Retorna null se não houver perguntas com scoring configurado.
   */
  calculate(
    templateSnapshot: { questions?: SnapshotQuestion[] },
    answers: Record<string, unknown>,
  ): MatchScoreResult | null {
    const questions = templateSnapshot?.questions ?? [];
    const scoredQuestions = questions.filter(
      (q) =>
        q.useForScoring === true &&
        q.weight != null &&
        q.weight >= 0 &&
        q.weight <= 10 &&
        q.scoringConfig != null &&
        SCORABLE_TYPES.includes(q.type as (typeof SCORABLE_TYPES)[number]),
    );

    if (scoredQuestions.length === 0) {
      return null;
    }

    const breakdown: MatchScoreBreakdownItem[] = [];
    let weightedSum = 0;
    const totalWeight = scoredQuestions.reduce((s, q) => s + (q.weight ?? 0), 0);

    for (const q of scoredQuestions) {
      const weight = q.weight ?? 0;
      const { points, answerDisplay } = this.getPointsForAnswer(
        q,
        answers[q.id],
        MAX_POINTS_PER_QUESTION,
      );

      const status = this.getStatus(points, MAX_POINTS_PER_QUESTION);
      breakdown.push({
        questionId: q.id,
        label: q.label,
        weight,
        answerDisplay,
        points,
        maxPoints: MAX_POINTS_PER_QUESTION,
        status,
      });

      weightedSum += (points / MAX_POINTS_PER_QUESTION) * weight;
    }

    const score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;
    const clampedScore = Math.min(100, Math.max(0, score));

    return {
      score: clampedScore,
      maxPossible: 100,
      totalWeight,
      breakdown,
      calculatedAt: new Date().toISOString(),
    };
  }

  private getPointsForAnswer(
    question: SnapshotQuestion,
    answer: unknown,
    maxPoints: number,
  ): { points: number; answerDisplay: string } {
    const config = question.scoringConfig as ScoringConfig | undefined;
    if (!config) return { points: 0, answerDisplay: '—' };

    switch (question.type) {
      case 'CHECKBOX': {
        const key = answer === true || answer === 'true' ? 'true' : 'false';
        const points = typeof config === 'object' && !Array.isArray(config) && key in config
          ? Number((config as Record<string, number>)[key]) ?? 0
          : 0;
        const label = answer === true || answer === 'true' ? 'Sim' : 'Não';
        return { points: Math.min(maxPoints, Math.max(0, points)), answerDisplay: label };
      }

      case 'SELECT_SINGLE': {
        const key = answer != null ? String(answer) : '';
        const points =
          typeof config === 'object' && !Array.isArray(config) && key in config
            ? Number((config as Record<string, number>)[key]) ?? 0
            : 0;
        const opt = question.options?.find((o) => o.value === key);
        const answerDisplay = (opt?.label ?? key) || '—';
        return { points: Math.min(maxPoints, Math.max(0, points)), answerDisplay };
      }

      case 'SELECT_MULTIPLE': {
        const values = Array.isArray(answer) ? answer.map(String) : answer != null ? [String(answer)] : [];
        let total = 0;
        if (typeof config === 'object' && !Array.isArray(config)) {
          for (const v of values) {
            if (v in config) {
              total += Number((config as Record<string, number>)[v]) ?? 0;
            }
          }
        }
        const points = Math.min(maxPoints, Math.max(0, total));
        const labels = values
          .map((v) => question.options?.find((o) => o.value === v)?.label ?? v)
          .filter(Boolean);
        const answerDisplay = labels.length > 0 ? labels.join(', ') : '—';
        return { points, answerDisplay };
      }

      case 'NUMBER': {
        const num = answer != null ? Number(answer) : NaN;
        if (Number.isNaN(num)) return { points: 0, answerDisplay: '—' };

        if ('ranges' in config && Array.isArray(config.ranges)) {
          for (const r of config.ranges) {
            if (num >= r.min && num <= r.max) {
              return {
                points: Math.min(maxPoints, Math.max(0, r.points)),
                answerDisplay: String(num),
              };
            }
          }
          return { points: 0, answerDisplay: String(num) };
        }

        if ('inverse' in config && config.inverse && 'maxPoints' in config) {
          const mp = Number(config.maxPoints) ?? 10;
          const pts = Math.max(0, mp - num);
          return { points: Math.min(maxPoints, pts), answerDisplay: String(num) };
        }

        return { points: 0, answerDisplay: String(num) };
      }

      default:
        return { points: 0, answerDisplay: '—' };
    }
  }

  private getStatus(points: number, maxPoints: number): 'match' | 'mismatch' | 'neutral' {
    const pct = maxPoints > 0 ? (points / maxPoints) * 100 : 0;
    if (pct >= 70) return 'match';
    if (pct < 40) return 'mismatch';
    return 'neutral';
  }
}
