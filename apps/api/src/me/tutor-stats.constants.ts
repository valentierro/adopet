/** Pontos por pet verificado (selo no anúncio). */
export const POINTS_PER_VERIFIED_PET = 10;

/** Pontos por pet adotado (status ADOPTED). */
export const POINTS_PER_ADOPTED_PET = 25;

/** Bônus pela primeira adoção. */
export const BONUS_FIRST_ADOPTION = 15;

/** Bônus por marcos de adoção (3ª, 5ª, 10ª...). */
export const MILESTONE_BONUS = 10;
export const MILESTONE_AT = [3, 5, 10];

export const TUTOR_LEVELS: { minPoints: number; level: string; title: string }[] = [
  { minPoints: 0, level: 'BEGINNER', title: 'Tutor Iniciante' },
  { minPoints: 25, level: 'ACTIVE', title: 'Tutor Ativo' },
  { minPoints: 75, level: 'TRUSTED', title: 'Tutor Confiável' },
  { minPoints: 150, level: 'STAR', title: 'Tutor Destaque' },
  { minPoints: 300, level: 'GOLD', title: 'Tutor Ouro' },
].sort((a, b) => b.minPoints - a.minPoints); // maior primeiro para achar nível
