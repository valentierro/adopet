import type { PetSimilarityProfile } from './similar-pets-engine.types';

/** Faixas de idade para similaridade: filhote, adulto, idoso */
function ageBucket(age: number): 'puppy' | 'adult' | 'senior' {
  if (age <= 1) return 'puppy';
  if (age <= 7) return 'adult';
  return 'senior';
}

/**
 * Calcula o score de similaridade (0–100) entre um pet de referência e um candidato.
 * Critérios: espécie (já filtrado), porte, faixa etária, sexo, energia, temperamento, raça.
 */
export function computeSimilarityScore(
  source: PetSimilarityProfile,
  candidate: PetSimilarityProfile,
): number {
  let totalWeight = 0;
  let earnedWeight = 0;

  // Porte – peso alto
  totalWeight += 2;
  if (source.size === candidate.size) {
    earnedWeight += 2;
  } else {
    // Mesma “classe” aproximada (small/medium vs large/xlarge)
    const smallMedium = ['small', 'medium'];
    const largeX = ['large', 'xlarge'];
    const s = source.size.toLowerCase();
    const c = candidate.size.toLowerCase();
    if (
      (smallMedium.includes(s) && smallMedium.includes(c)) ||
      (largeX.includes(s) && largeX.includes(c))
    ) {
      earnedWeight += 1;
    }
  }

  // Faixa etária
  totalWeight += 1.5;
  if (ageBucket(source.age) === ageBucket(candidate.age)) {
    earnedWeight += 1.5;
  } else {
    // Idade próxima (ex.: 1 e 2 anos)
    const diff = Math.abs(source.age - candidate.age);
    if (diff <= 2) earnedWeight += 0.75;
  }

  // Sexo
  totalWeight += 1;
  if (source.sex === candidate.sex) {
    earnedWeight += 1;
  }

  // Nível de energia
  if (source.energyLevel != null && source.energyLevel !== '' && candidate.energyLevel != null && candidate.energyLevel !== '') {
    totalWeight += 1;
    if (source.energyLevel === candidate.energyLevel) earnedWeight += 1;
  }

  // Temperamento
  if (source.temperament != null && source.temperament !== '' && candidate.temperament != null && candidate.temperament !== '') {
    totalWeight += 1;
    if (source.temperament === candidate.temperament) earnedWeight += 1;
  }

  // Raça (opcional, peso menor)
  if (source.breed != null && source.breed.trim() !== '' && candidate.breed != null && candidate.breed.trim() !== '') {
    totalWeight += 0.5;
    const s = source.breed.trim().toLowerCase();
    const c = candidate.breed.trim().toLowerCase();
    if (s === c) {
      earnedWeight += 0.5;
    } else if (s.includes(c) || c.includes(s)) {
      earnedWeight += 0.25;
    }
  }

  if (totalWeight === 0) return 100;
  return Math.round((earnedWeight / totalWeight) * 100);
}
