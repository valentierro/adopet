import { Test, TestingModule } from '@nestjs/testing';
import { MatchScoreService } from './match-score.service';

describe('MatchScoreService', () => {
  let service: MatchScoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MatchScoreService],
    }).compile();
    service = module.get<MatchScoreService>(MatchScoreService);
  });

  it('retorna null quando não há perguntas com scoring', () => {
    const result = service.calculate({ questions: [] }, {});
    expect(result).toBeNull();
  });

  it('retorna null quando perguntas não têm useForScoring', () => {
    const template = {
      questions: [
        {
          id: 'q1',
          type: 'SELECT_SINGLE',
          label: 'Moradia?',
          useForScoring: false,
          weight: 5,
          scoringConfig: { casa: 10, apartamento: 5 },
          options: [{ value: 'casa', label: 'Casa' }, { value: 'apartamento', label: 'Apto' }],
        },
      ],
    };
    const result = service.calculate(template, { q1: 'casa' });
    expect(result).toBeNull();
  });

  it('calcula score para CHECKBOX com Sim', () => {
    const template = {
      questions: [
        {
          id: 'q1',
          type: 'CHECKBOX',
          label: 'Quintal?',
          useForScoring: true,
          weight: 10,
          scoringConfig: { true: 10, false: 0 },
        },
      ],
    };
    const result = service.calculate(template, { q1: true });
    expect(result).not.toBeNull();
    expect(result!.score).toBe(100);
    expect(result!.breakdown).toHaveLength(1);
    expect(result!.breakdown[0].answerDisplay).toBe('Sim');
  });

  it('calcula score para CHECKBOX com Não', () => {
    const template = {
      questions: [
        {
          id: 'q1',
          type: 'CHECKBOX',
          label: 'Quintal?',
          useForScoring: true,
          weight: 10,
          scoringConfig: { true: 10, false: 0 },
        },
      ],
    };
    const result = service.calculate(template, { q1: false });
    expect(result).not.toBeNull();
    expect(result!.score).toBe(0);
    expect(result!.breakdown[0].answerDisplay).toBe('Não');
  });

  it('calcula score para SELECT_SINGLE', () => {
    const template = {
      questions: [
        {
          id: 'q1',
          type: 'SELECT_SINGLE',
          label: 'Moradia?',
          useForScoring: true,
          weight: 7,
          scoringConfig: { casa: 10, apartamento: 8, outro: 5 },
          options: [{ value: 'casa', label: 'Casa' }, { value: 'apartamento', label: 'Apto' }],
        },
      ],
    };
    const result = service.calculate(template, { q1: 'casa' });
    expect(result).not.toBeNull();
    expect(result!.score).toBe(100);
  });

  it('calcula score ponderado com múltiplas perguntas', () => {
    const template = {
      questions: [
        {
          id: 'q1',
          type: 'CHECKBOX',
          label: 'Quintal?',
          useForScoring: true,
          weight: 10,
          scoringConfig: { true: 10, false: 0 },
        },
        {
          id: 'q2',
          type: 'CHECKBOX',
          label: 'Outros pets?',
          useForScoring: true,
          weight: 10,
          scoringConfig: { true: 10, false: 0 },
        },
      ],
    };
    const result = service.calculate(template, { q1: true, q2: false });
    expect(result).not.toBeNull();
    expect(result!.score).toBe(50);
    expect(result!.breakdown).toHaveLength(2);
  });

  it('respeita peso diferente entre perguntas', () => {
    const template = {
      questions: [
        {
          id: 'q1',
          type: 'CHECKBOX',
          label: 'Quintal?',
          useForScoring: true,
          weight: 10,
          scoringConfig: { true: 10, false: 0 },
        },
        {
          id: 'q2',
          type: 'CHECKBOX',
          label: 'Outros pets?',
          useForScoring: true,
          weight: 2,
          scoringConfig: { true: 10, false: 0 },
        },
      ],
    };
    const result = service.calculate(template, { q1: false, q2: true });
    expect(result).not.toBeNull();
    const totalWeight = 12;
    const weightedSum = (0 / 10) * 10 + (10 / 10) * 2;
    expect(result!.score).toBe(Math.round((weightedSum / totalWeight) * 100));
  });

  it('retorna status match/mismatch/neutral no breakdown', () => {
    const template = {
      questions: [
        {
          id: 'q1',
          type: 'CHECKBOX',
          label: 'Alta pontuação',
          useForScoring: true,
          weight: 10,
          scoringConfig: { true: 10, false: 0 },
        },
        {
          id: 'q2',
          type: 'CHECKBOX',
          label: 'Baixa pontuação',
          useForScoring: true,
          weight: 10,
          scoringConfig: { true: 2, false: 0 },
        },
      ],
    };
    const result = service.calculate(template, { q1: true, q2: true });
    expect(result).not.toBeNull();
    const high = result!.breakdown.find((b) => b.points === 10);
    const low = result!.breakdown.find((b) => b.points === 2);
    expect(high?.status).toBe('match');
    expect(low?.status).toBe('mismatch');
  });

  it('trata respostas ausentes como 0 pontos', () => {
    const template = {
      questions: [
        {
          id: 'q1',
          type: 'SELECT_SINGLE',
          label: 'Moradia?',
          useForScoring: true,
          weight: 10,
          scoringConfig: { casa: 10, apartamento: 5 },
          options: [{ value: 'casa', label: 'Casa' }],
        },
      ],
    };
    const result = service.calculate(template, {});
    expect(result).not.toBeNull();
    expect(result!.score).toBe(0);
    expect(result!.breakdown[0].answerDisplay).toBe('—');
  });
});
