/**
 * Tipos para o Match Score Engine de formulários de adoção.
 * Extensível para futuro scoring por AI.
 */

/** Configuração de pontuação por tipo de pergunta */
export type ScoringConfig =
  | Record<string, number>
  | { ranges: Array<{ min: number; max: number; points: number }> }
  | { inverse: boolean; maxPoints: number };

/** Pergunta no snapshot do template (com scoring opcional) */
export type SnapshotQuestion = {
  id: string;
  type: string;
  label: string;
  useForScoring?: boolean;
  weight?: number;
  scoringConfig?: ScoringConfig;
  options?: Array<{ value: string; label: string }>;
};

/** Item do breakdown para auditoria */
export type MatchScoreBreakdownItem = {
  questionId: string;
  label: string;
  weight: number;
  answerDisplay: string;
  points: number;
  maxPoints: number;
  status: 'match' | 'mismatch' | 'neutral';
};

/** Resultado do cálculo */
export type MatchScoreResult = {
  score: number;
  maxPossible: number;
  totalWeight: number;
  breakdown: MatchScoreBreakdownItem[];
  calculatedAt: string;
};
