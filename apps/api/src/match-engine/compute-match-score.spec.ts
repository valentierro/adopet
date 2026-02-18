import { computeMatchScore } from './compute-match-score';
import type { AdopterProfile, PetTutorPreferences } from './match-engine.types';

describe('computeMatchScore', () => {
  it('retorna score null e listas vazias quando o pet não tem preferências', () => {
    const adopter: AdopterProfile = {
      housingType: 'CASA',
      hasYard: true,
      timeAtHome: 'MOST_DAY',
    };
    const pet: PetTutorPreferences = {};
    const result = computeMatchScore(adopter, pet);
    expect(result.score).toBeNull();
    expect(result.highlights).toEqual([]);
    expect(result.concerns).toEqual([]);
    expect(result.criteriaCount).toBe(0);
    expect(result.criteria).toEqual([]);
  });

  it('retorna 100% quando todos os critérios batem', () => {
    const adopter: AdopterProfile = {
      housingType: 'CASA',
      hasYard: true,
      hasOtherPets: false,
      hasChildren: false,
      timeAtHome: 'MOST_DAY',
      petsAllowedAtHome: 'YES',
      dogExperience: 'HAVE_NOW',
      catExperience: 'NEVER',
      householdAgreesToAdoption: 'YES',
    };
    const pet: PetTutorPreferences = {
      preferredTutorHousingType: 'CASA',
      preferredTutorHasYard: true,
      preferredTutorHasOtherPets: false,
      preferredTutorHasChildren: false,
      preferredTutorTimeAtHome: 'MOST_DAY',
      preferredTutorPetsAllowedAtHome: 'YES',
      preferredTutorDogExperience: 'HAVE_NOW',
      preferredTutorCatExperience: 'NEVER',
      preferredTutorHouseholdAgrees: 'YES',
    };
    const result = computeMatchScore(adopter, pet);
    expect(result.score).toBe(100);
    expect(result.criteriaCount).toBe(9);
    expect(result.concerns).toHaveLength(0);
    expect(result.highlights.length).toBeGreaterThan(0);
  });

  it('retorna score baixo quando há conflitos', () => {
    const adopter: AdopterProfile = {
      housingType: 'APARTAMENTO',
      hasYard: false,
      timeAtHome: 'LITTLE',
    };
    const pet: PetTutorPreferences = {
      preferredTutorHousingType: 'CASA',
      preferredTutorHasYard: true,
      preferredTutorTimeAtHome: 'MOST_DAY',
    };
    const result = computeMatchScore(adopter, pet);
    expect(result.score).toBeLessThan(50);
    expect(result.criteriaCount).toBe(3);
    expect(result.concerns.length).toBeGreaterThan(0);
  });

  it('adotante sem dado no critério conta como 50% (neutro)', () => {
    const adopter: AdopterProfile = {}; // nada preenchido
    const pet: PetTutorPreferences = {
      preferredTutorHousingType: 'CASA',
      preferredTutorHasYard: true,
    };
    const result = computeMatchScore(adopter, pet);
    expect(result.score).toBe(50); // 0.5 + 0.5 sobre 2 critérios
    expect(result.criteriaCount).toBe(2);
  });

  it('um match e um conflito dá score 50', () => {
    const adopter: AdopterProfile = {
      housingType: 'CASA',
      hasYard: false,
    };
    const pet: PetTutorPreferences = {
      preferredTutorHousingType: 'CASA',
      preferredTutorHasYard: true,
    };
    const result = computeMatchScore(adopter, pet);
    expect(result.score).toBe(50);
    expect(result.highlights.some((h) => h.includes('Moradia'))).toBe(true);
    expect(result.concerns.some((c) => c.toLowerCase().includes('quintal'))).toBe(true);
    expect(result.criteria).toHaveLength(2);
    expect(result.criteria.map((c) => c.status)).toEqual(['match', 'mismatch']);
  });

  it('moradia INDIFERENTE dá match com casa ou apartamento', () => {
    const pet: PetTutorPreferences = { preferredTutorHousingType: 'INDIFERENTE' };
    const resultCasa = computeMatchScore({ housingType: 'CASA' }, pet);
    const resultApto = computeMatchScore({ housingType: 'APARTAMENTO' }, pet);
    expect(resultCasa.score).toBe(100);
    expect(resultApto.score).toBe(100);
    expect(resultCasa.highlights.some((h) => h.includes('Indiferente') || h.includes('indiferente'))).toBe(true);
    expect(resultApto.highlights.some((h) => h.includes('Indiferente') || h.includes('indiferente'))).toBe(true);
  });

  it('experiência: adotante com HAVE_NOW atende preferência HAD_BEFORE', () => {
    const adopter: AdopterProfile = { dogExperience: 'HAVE_NOW' };
    const pet: PetTutorPreferences = { preferredTutorDogExperience: 'HAD_BEFORE' };
    const result = computeMatchScore(adopter, pet);
    expect(result.score).toBe(100);
    expect(result.highlights.some((h) => h.includes('cachorro'))).toBe(true);
  });

  it('experiência: adotante NEVER não atende preferência HAVE_NOW', () => {
    const adopter: AdopterProfile = { dogExperience: 'NEVER' };
    const pet: PetTutorPreferences = { preferredTutorDogExperience: 'HAVE_NOW' };
    const result = computeMatchScore(adopter, pet);
    expect(result.score).toBe(0);
    expect(result.concerns.length).toBeGreaterThan(0);
  });

  it('petsAllowedAtHome: conflito YES vs NO gera concern', () => {
    const adopter: AdopterProfile = { petsAllowedAtHome: 'NO' };
    const pet: PetTutorPreferences = { preferredTutorPetsAllowedAtHome: 'YES' };
    const result = computeMatchScore(adopter, pet);
    expect(result.concerns.some((c) => c.includes('permitidos') || c.includes('local'))).toBe(true);
  });

  it('householdAgrees: DISCUSSING quando pet prefere YES gera concern', () => {
    const adopter: AdopterProfile = { householdAgreesToAdoption: 'DISCUSSING' };
    const pet: PetTutorPreferences = { preferredTutorHouseholdAgrees: 'YES' };
    const result = computeMatchScore(adopter, pet);
    expect(result.concerns.some((c) => c.includes('concordem') || c.includes('casa'))).toBe(true);
  });

  it('score fica entre 0 e 100', () => {
    const adopter: AdopterProfile = { housingType: 'CASA', hasYard: true, hasOtherPets: true };
    const pet: PetTutorPreferences = {
      preferredTutorHousingType: 'APARTAMENTO',
      preferredTutorHasYard: false,
      preferredTutorHasOtherPets: false,
    };
    const result = computeMatchScore(adopter, pet);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
