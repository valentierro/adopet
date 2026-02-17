import type { AdopterProfile, PetTutorPreferences, MatchResult } from './match-engine.types';

const LABELS = {
  housing: { CASA: 'Casa', APARTAMENTO: 'Apartamento', INDIFERENTE: 'Indiferente' },
  timeAtHome: { MOST_DAY: 'Maior parte do dia', HALF_DAY: 'Metade do dia', LITTLE: 'Pouco tempo' },
  petsAllowed: { YES: 'Sim', NO: 'Não', UNSURE: 'Não sei' },
  experience: { NEVER: 'Nunca tive', HAD_BEFORE: 'Já tive', HAVE_NOW: 'Tenho atualmente' },
  householdAgrees: { YES: 'Todos concordam', DISCUSSING: 'Ainda conversando' },
  activity: { LOW: 'Sedentário', MEDIUM: 'Moderado', HIGH: 'Ativo' },
  preferredAge: { PUPPY: 'Filhote', ADULT: 'Adulto', SENIOR: 'Idoso', ANY: 'Qualquer' },
  walkFreq: { DAILY: 'Diariamente', FEW_TIMES_WEEK: 'Algumas vezes por semana', RARELY: 'Raramente', NOT_APPLICABLE: 'Não se aplica', INDIFERENTE: 'Indiferente' },
  budget: { LOW: 'Até ~R$ 100/mês', MEDIUM: '~R$ 100–300/mês', HIGH: 'Acima de ~R$ 300/mês' },
  species: { DOG: 'Cachorro', CAT: 'Gato' },
  sex: { male: 'Macho', female: 'Fêmea' },
} as const;

/**
 * Calcula o score de match entre um adotante e as preferências de tutor do pet.
 * Pura (sem I/O): recebe perfis já carregados.
 * - Se o pet não tem nenhuma preferência definida, retorna score null e listas vazias.
 * - Cada critério com preferência no pet: match = 100% para esse critério, conflito = 0%.
 * - Adotante sem dado no critério: conta como 50% (neutro) para não penalizar quem não preencheu.
 */
export function computeMatchScore(
  adopter: AdopterProfile,
  petPreferences: PetTutorPreferences,
): MatchResult {
  const highlights: string[] = [];
  const concerns: string[] = [];
  let totalWeight = 0;
  let earnedWeight = 0;

  // Moradia
  if (petPreferences.preferredTutorHousingType != null && petPreferences.preferredTutorHousingType !== '') {
    totalWeight += 1;
    const adopterVal = adopter.housingType;
    const preferred = petPreferences.preferredTutorHousingType;
    if (preferred === 'INDIFERENTE') {
      earnedWeight += 1;
      highlights.push('Moradia: indiferente (compatível com casa ou apartamento)');
    } else if (adopterVal == null || adopterVal === '') {
      earnedWeight += 0.5;
    } else if (adopterVal === preferred) {
      earnedWeight += 1;
      highlights.push(`Moradia compatível (${LABELS.housing[preferred as keyof typeof LABELS.housing] ?? preferred})`);
    } else {
      concerns.push(`Pet prefere tutor em ${LABELS.housing[preferred as keyof typeof LABELS.housing] ?? preferred}; você informou ${LABELS.housing[adopterVal as keyof typeof LABELS.housing] ?? adopterVal}.`);
    }
  }

  // Quintal
  if (petPreferences.preferredTutorHasYard != null) {
    totalWeight += 1;
    const adopterVal = adopter.hasYard;
    const preferred = petPreferences.preferredTutorHasYard;
    if (adopterVal === undefined || adopterVal === null) {
      earnedWeight += 0.5;
    } else if (adopterVal === preferred) {
      earnedWeight += 1;
      highlights.push(preferred ? 'Quintal compatível' : 'Sem quintal, conforme preferência do pet.');
    } else {
      concerns.push(preferred ? 'Pet prefere tutor com quintal.' : 'Pet prefere tutor sem quintal.');
    }
  }

  // Outros pets
  if (petPreferences.preferredTutorHasOtherPets != null) {
    totalWeight += 1;
    const adopterVal = adopter.hasOtherPets;
    const preferred = petPreferences.preferredTutorHasOtherPets;
    if (adopterVal === undefined || adopterVal === null) {
      earnedWeight += 0.5;
    } else if (adopterVal === preferred) {
      earnedWeight += 1;
      highlights.push(preferred ? 'Outros pets no local, compatível.' : 'Sem outros pets, compatível.');
    } else {
      concerns.push(preferred ? 'Pet se adapta melhor a lares com outros pets.' : 'Pet prefere ser o único pet.');
    }
  }

  // Crianças
  if (petPreferences.preferredTutorHasChildren != null) {
    totalWeight += 1;
    const adopterVal = adopter.hasChildren;
    const preferred = petPreferences.preferredTutorHasChildren;
    if (adopterVal === undefined || adopterVal === null) {
      earnedWeight += 0.5;
    } else if (adopterVal === preferred) {
      earnedWeight += 1;
      highlights.push(preferred ? 'Crianças em casa, compatível.' : 'Sem crianças, compatível.');
    } else {
      concerns.push(preferred ? 'Pet se dá bem com crianças; seu perfil indica sem crianças.' : 'Pet prefere lar sem crianças.');
    }
  }

  // Tempo em casa
  if (petPreferences.preferredTutorTimeAtHome != null && petPreferences.preferredTutorTimeAtHome !== '') {
    totalWeight += 1;
    const adopterVal = adopter.timeAtHome;
    const preferred = petPreferences.preferredTutorTimeAtHome;
    if (adopterVal == null || adopterVal === '') {
      earnedWeight += 0.5;
    } else if (adopterVal === preferred) {
      earnedWeight += 1;
      highlights.push(`Tempo em casa compatível (${LABELS.timeAtHome[preferred as keyof typeof LABELS.timeAtHome] ?? preferred})`);
    } else {
      concerns.push(`Pet prefere tutor que fica ${LABELS.timeAtHome[preferred as keyof typeof LABELS.timeAtHome] ?? preferred}.`);
    }
  }

  // Pets permitidos no local
  if (petPreferences.preferredTutorPetsAllowedAtHome != null && petPreferences.preferredTutorPetsAllowedAtHome !== '') {
    totalWeight += 1;
    const adopterVal = adopter.petsAllowedAtHome;
    const preferred = petPreferences.preferredTutorPetsAllowedAtHome;
    if (adopterVal == null || adopterVal === '') {
      earnedWeight += 0.5;
    } else if (adopterVal === preferred) {
      earnedWeight += 1;
      highlights.push(`Pets permitidos no local: ${LABELS.petsAllowed[preferred as keyof typeof LABELS.petsAllowed] ?? preferred}`);
    } else if (preferred === 'YES' && (adopterVal === 'NO' || adopterVal === 'UNSURE')) {
      concerns.push('Pet precisa de local onde pets são permitidos.');
    } else if (preferred === 'NO' && adopterVal === 'YES') {
      concerns.push('Pet prefere tutor em local onde pets não são permitidos (ex.: restrição do condomínio).');
    } else {
      earnedWeight += 0.5;
    }
  }

  // Experiência com cachorro
  if (petPreferences.preferredTutorDogExperience != null && petPreferences.preferredTutorDogExperience !== '') {
    totalWeight += 1;
    const adopterVal = adopter.dogExperience;
    const preferred = petPreferences.preferredTutorDogExperience;
    if (adopterVal == null || adopterVal === '') {
      earnedWeight += 0.5;
    } else if (adopterVal === preferred) {
      earnedWeight += 1;
      highlights.push(`Experiência com cachorro: ${LABELS.experience[preferred as keyof typeof LABELS.experience] ?? preferred}`);
    } else {
      const order: Record<string, number> = { NEVER: 0, HAD_BEFORE: 1, HAVE_NOW: 2 };
      const a = order[adopterVal] ?? -1;
      const p = order[preferred] ?? -1;
      if (a >= p) {
        earnedWeight += 1;
        highlights.push(`Experiência com cachorro: ${LABELS.experience[preferred as keyof typeof LABELS.experience] ?? preferred}`);
      } else {
        concerns.push(`Pet prefere tutor com experiência com cachorro (${LABELS.experience[preferred as keyof typeof LABELS.experience] ?? preferred}).`);
      }
    }
  }

  // Experiência com gato
  if (petPreferences.preferredTutorCatExperience != null && petPreferences.preferredTutorCatExperience !== '') {
    totalWeight += 1;
    const adopterVal = adopter.catExperience;
    const preferred = petPreferences.preferredTutorCatExperience;
    if (adopterVal == null || adopterVal === '') {
      earnedWeight += 0.5;
    } else if (adopterVal === preferred) {
      earnedWeight += 1;
      highlights.push(`Experiência com gato: ${LABELS.experience[preferred as keyof typeof LABELS.experience] ?? preferred}`);
    } else {
      const order: Record<string, number> = { NEVER: 0, HAD_BEFORE: 1, HAVE_NOW: 2 };
      const a = order[adopterVal] ?? -1;
      const p = order[preferred] ?? -1;
      if (a >= p) {
        earnedWeight += 1;
        highlights.push(`Experiência com gato: ${LABELS.experience[preferred as keyof typeof LABELS.experience] ?? preferred}`);
      } else {
        concerns.push(`Pet prefere tutor com experiência com gato (${LABELS.experience[preferred as keyof typeof LABELS.experience] ?? preferred}).`);
      }
    }
  }

  // Concordância em casa
  if (petPreferences.preferredTutorHouseholdAgrees != null && petPreferences.preferredTutorHouseholdAgrees !== '') {
    totalWeight += 1;
    const adopterVal = adopter.householdAgreesToAdoption;
    const preferred = petPreferences.preferredTutorHouseholdAgrees;
    if (adopterVal == null || adopterVal === '') {
      earnedWeight += 0.5;
    } else if (adopterVal === preferred) {
      earnedWeight += 1;
      highlights.push(`Concordância em casa: ${LABELS.householdAgrees[preferred as keyof typeof LABELS.householdAgrees] ?? preferred}`);
    } else if (preferred === 'YES' && adopterVal === 'DISCUSSING') {
      concerns.push('Pet prefere que todos em casa já concordem com a adoção.');
    } else {
      earnedWeight += 0.5;
    }
  }

  // Espécie do pet × preferência do adotante (speciesPref)
  const speciesPref = adopter.speciesPref?.toUpperCase?.() ?? null;
  if (petPreferences.species != null && petPreferences.species !== '' && speciesPref && speciesPref !== 'BOTH') {
    totalWeight += 1;
    const petSpecies = petPreferences.species.toUpperCase();
    if (petSpecies === speciesPref) {
      earnedWeight += 1;
      highlights.push(`Espécie compatível com sua preferência (${LABELS.species[speciesPref as keyof typeof LABELS.species] ?? speciesPref}).`);
    } else {
      concerns.push(`Você prefere ${LABELS.species[speciesPref as keyof typeof LABELS.species] ?? speciesPref}; este pet é ${LABELS.species[petSpecies as keyof typeof LABELS.species] ?? petSpecies}.`);
    }
  }

  // Sexo do pet × preferência do adotante (sexPref)
  const sexPref = adopter.sexPref?.toLowerCase?.() ?? null;
  if (petPreferences.sex != null && petPreferences.sex !== '' && sexPref && sexPref !== 'both') {
    totalWeight += 1;
    const petSex = petPreferences.sex.toLowerCase();
    if (petSex === sexPref) {
      earnedWeight += 1;
      highlights.push(`Sexo do pet compatível com sua preferência (${LABELS.sex[sexPref as keyof typeof LABELS.sex] ?? sexPref}).`);
    } else {
      concerns.push(`Você prefere pet ${LABELS.sex[sexPref as keyof typeof LABELS.sex] ?? sexPref}; este pet é ${LABELS.sex[petSex as keyof typeof LABELS.sex] ?? petSex}.`);
    }
  }

  // Porte do pet × preferência do adotante (sizePref)
  if (petPreferences.size != null && petPreferences.size !== '') {
    const adopterSizePref = adopter.sizePref?.toLowerCase?.() ?? null;
    if (adopterSizePref && adopterSizePref !== 'both') {
      totalWeight += 1;
      const petSize = petPreferences.size.toLowerCase();
      if (petSize === adopterSizePref) {
        earnedWeight += 1;
        highlights.push(`Porte compatível com sua preferência (${petSize}).`);
      } else {
        concerns.push(`Você prefere pet ${adopterSizePref}; este pet é ${petSize}.`);
      }
    }
  }

  // Nível de atividade (adotante) × energia do pet
  if (petPreferences.energyLevel != null && petPreferences.energyLevel !== '') {
    const adopterActivity = adopter.activityLevel;
    const petEnergy = petPreferences.energyLevel;
    if (adopterActivity != null && adopterActivity !== '') {
      totalWeight += 1;
      const order = { LOW: 0, MEDIUM: 1, HIGH: 2 };
      const a = order[adopterActivity as keyof typeof order] ?? -1;
      const p = order[petEnergy as keyof typeof order] ?? -1;
      if (a >= p) {
        earnedWeight += 1;
        highlights.push(`Seu nível de atividade combina com o pet (${LABELS.activity[petEnergy as keyof typeof LABELS.activity] ?? petEnergy}).`);
      } else {
        concerns.push(`Pet é mais ativo (${LABELS.activity[petEnergy as keyof typeof LABELS.activity] ?? petEnergy}) do que seu perfil indica.`);
      }
    } else {
      totalWeight += 1;
      earnedWeight += 0.5;
    }
  }

  // Idade preferida (adotante) × idade do pet
  if (adopter.preferredPetAge != null && adopter.preferredPetAge !== '' && adopter.preferredPetAge !== 'ANY') {
    const petAge = petPreferences.age;
    if (typeof petAge === 'number') {
      totalWeight += 1;
      const petAgeGroup = petAge < 2 ? 'PUPPY' : petAge <= 7 ? 'ADULT' : 'SENIOR';
      const preferred = adopter.preferredPetAge;
      if (petAgeGroup === preferred) {
        earnedWeight += 1;
        highlights.push(`Idade do pet compatível com sua preferência (${LABELS.preferredAge[preferred as keyof typeof LABELS.preferredAge] ?? preferred}).`);
      } else {
        concerns.push(`Você prefere pet ${LABELS.preferredAge[preferred as keyof typeof LABELS.preferredAge] ?? preferred}; este tem ${petAge} ano(s).`);
      }
    }
  }

  // Compromisso com cuidados veterinários × pet com necessidades especiais
  const petNeedsVetCare = petPreferences.hasSpecialNeeds === true || (petPreferences.healthNotes != null && String(petPreferences.healthNotes).trim() !== '');
  if (petNeedsVetCare) {
    totalWeight += 1;
    const adopterCommits = adopter.commitsToVetCare;
    if (adopterCommits === 'YES') {
      earnedWeight += 1;
      highlights.push('Você se compromete com cuidados veterinários; o pet tem necessidades que exigem acompanhamento.');
    } else if (adopterCommits === 'NO') {
      concerns.push('Este pet precisa de acompanhamento veterinário; seu perfil indica que não pode se comprometer com isso.');
    } else {
      earnedWeight += 0.5;
    }
  }

  // Frequência de passeios (adotante) × preferência do pet
  if (petPreferences.preferredTutorWalkFrequency != null && petPreferences.preferredTutorWalkFrequency !== '' && petPreferences.preferredTutorWalkFrequency !== 'INDIFERENTE') {
    totalWeight += 1;
    const adopterWalk = adopter.walkFrequency;
    const preferred = petPreferences.preferredTutorWalkFrequency;
    const order = { RARELY: 0, FEW_TIMES_WEEK: 1, DAILY: 2, NOT_APPLICABLE: -1 };
    const a = order[adopterWalk as keyof typeof order] ?? -1;
    const p = order[preferred as keyof typeof order] ?? -1;
    if (adopterWalk == null || adopterWalk === '') {
      earnedWeight += 0.5;
    } else if (adopterWalk === 'NOT_APPLICABLE' && preferred !== 'NOT_APPLICABLE') {
      earnedWeight += 0.5;
    } else if (a >= p && a >= 0) {
      earnedWeight += 1;
      highlights.push(`Frequência de passeios compatível (${LABELS.walkFreq[preferred as keyof typeof LABELS.walkFreq] ?? preferred}).`);
    } else {
      concerns.push(`Pet prefere tutor que passeie com mais frequência (${LABELS.walkFreq[preferred as keyof typeof LABELS.walkFreq] ?? preferred}).`);
    }
  }

  // Orçamento (adotante) × pet com gastos contínuos
  if (petPreferences.hasOngoingCosts === true) {
    totalWeight += 1;
    const adopterBudget = adopter.monthlyBudgetForPet;
    if (adopterBudget === 'HIGH' || adopterBudget === 'MEDIUM') {
      earnedWeight += 1;
      highlights.push('Seu orçamento permite arcar com os cuidados contínuos deste pet.');
    } else if (adopterBudget === 'LOW') {
      concerns.push('Este pet tem gastos contínuos (ex.: medicação, ração especial); seu orçamento informado é baixo.');
    } else {
      earnedWeight += 0.5;
    }
  }

  if (totalWeight === 0) {
    return { score: null, highlights: [], concerns: [], criteriaCount: 0 };
  }

  const score = Math.round((earnedWeight / totalWeight) * 100);
  return {
    score: Math.min(100, Math.max(0, score)),
    highlights,
    concerns,
    criteriaCount: totalWeight,
  };
}
