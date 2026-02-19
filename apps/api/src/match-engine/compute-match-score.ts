import type { AdopterProfile, PetTutorPreferences, MatchResult, MatchCriterion } from './match-engine.types';

const LABELS = {
  housing: { CASA: 'Casa', APARTAMENTO: 'Apartamento', INDIFERENTE: 'Indiferente' },
  timeAtHome: { MOST_DAY: 'Maior parte do dia', HALF_DAY: 'Metade do dia', LITTLE: 'Pouco tempo', INDIFERENTE: 'Indiferente' },
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
  const criteria: MatchCriterion[] = [];
  let totalWeight = 0;
  let earnedWeight = 0;

  const LABEL = { housing: 'Moradia', yard: 'Quintal', otherPets: 'Outros pets', children: 'Crianças', timeAtHome: 'Tempo em casa', petsAllowed: 'Pets no local', dogExp: 'Experiência com cachorro', catExp: 'Experiência com gato', householdAgrees: 'Concordância em casa', species: 'Espécie', sex: 'Sexo do pet', size: 'Porte', activity: 'Nível de atividade', age: 'Idade do pet', vetCare: 'Cuidados veterinários', walkFreq: 'Passeios', budget: 'Orçamento' } as const;

  // Moradia
  if (petPreferences.preferredTutorHousingType != null && petPreferences.preferredTutorHousingType !== '') {
    totalWeight += 1;
    const adopterVal = adopter.housingType;
    const preferred = petPreferences.preferredTutorHousingType;
    if (preferred === 'INDIFERENTE') {
      earnedWeight += 1;
      const msg = 'Moradia: indiferente (compatível com casa ou apartamento)';
      highlights.push(msg);
      criteria.push({ label: LABEL.housing, status: 'match', message: msg });
    } else if (adopterVal == null || adopterVal === '') {
      earnedWeight += 0.5;
      criteria.push({ label: LABEL.housing, status: 'neutral', message: 'Você não informou no perfil. O pet prefere tutor em ' + (LABELS.housing[preferred as keyof typeof LABELS.housing] ?? preferred) + '.' });
    } else if (adopterVal === preferred) {
      earnedWeight += 1;
      const msg = `Moradia compatível (${LABELS.housing[preferred as keyof typeof LABELS.housing] ?? preferred})`;
      highlights.push(msg);
      criteria.push({ label: LABEL.housing, status: 'match', message: msg });
    } else {
      const msg = `Pet prefere tutor em ${LABELS.housing[preferred as keyof typeof LABELS.housing] ?? preferred}; você informou ${LABELS.housing[adopterVal as keyof typeof LABELS.housing] ?? adopterVal}.`;
      concerns.push(msg);
      criteria.push({ label: LABEL.housing, status: 'mismatch', message: msg });
    }
  }

  // Quintal (SIM | NAO | INDIFERENTE)
  if (petPreferences.preferredTutorHasYard != null && petPreferences.preferredTutorHasYard !== '') {
    totalWeight += 1;
    const preferred = petPreferences.preferredTutorHasYard;
    if (preferred === 'INDIFERENTE') {
      earnedWeight += 1;
      const msg = 'Quintal: indiferente (compatível com ou sem quintal).';
      highlights.push(msg);
      criteria.push({ label: LABEL.yard, status: 'match', message: msg });
    } else {
      const adopterVal = adopter.hasYard;
      const preferredBool = preferred === 'SIM';
      if (adopterVal === undefined || adopterVal === null) {
        earnedWeight += 0.5;
        criteria.push({ label: LABEL.yard, status: 'neutral', message: 'Você não informou no perfil. O pet prefere tutor ' + (preferredBool ? 'com quintal.' : 'sem quintal.') });
      } else if (adopterVal === preferredBool) {
        earnedWeight += 1;
        const msg = preferredBool ? 'Quintal compatível' : 'Sem quintal, conforme preferência do pet.';
        highlights.push(msg);
        criteria.push({ label: LABEL.yard, status: 'match', message: msg });
      } else {
        const msg = preferredBool ? 'Pet prefere tutor com quintal.' : 'Pet prefere tutor sem quintal.';
        concerns.push(msg);
        criteria.push({ label: LABEL.yard, status: 'mismatch', message: msg });
      }
    }
  }

  // Outros pets (SIM | NAO | INDIFERENTE)
  if (petPreferences.preferredTutorHasOtherPets != null && petPreferences.preferredTutorHasOtherPets !== '') {
    totalWeight += 1;
    const preferred = petPreferences.preferredTutorHasOtherPets;
    if (preferred === 'INDIFERENTE') {
      earnedWeight += 1;
      const msg = 'Outros pets: indiferente (compatível com ou sem outros pets).';
      highlights.push(msg);
      criteria.push({ label: LABEL.otherPets, status: 'match', message: msg });
    } else {
      const adopterVal = adopter.hasOtherPets;
      const preferredBool = preferred === 'SIM';
      if (adopterVal === undefined || adopterVal === null) {
        earnedWeight += 0.5;
        criteria.push({ label: LABEL.otherPets, status: 'neutral', message: 'Você não informou no perfil. O pet ' + (preferredBool ? 'se adapta a lares com outros pets.' : 'prefere ser o único pet.') });
      } else if (adopterVal === preferredBool) {
        earnedWeight += 1;
        const msg = preferredBool ? 'Outros pets no local, compatível.' : 'Sem outros pets, compatível.';
        highlights.push(msg);
        criteria.push({ label: LABEL.otherPets, status: 'match', message: msg });
      } else {
        const msg = preferredBool ? 'Pet se adapta melhor a lares com outros pets.' : 'Pet prefere ser o único pet.';
        concerns.push(msg);
        criteria.push({ label: LABEL.otherPets, status: 'mismatch', message: msg });
      }
    }
  }

  // Crianças (SIM | NAO | INDIFERENTE)
  if (petPreferences.preferredTutorHasChildren != null && petPreferences.preferredTutorHasChildren !== '') {
    totalWeight += 1;
    const preferred = petPreferences.preferredTutorHasChildren;
    if (preferred === 'INDIFERENTE') {
      earnedWeight += 1;
      const msg = 'Crianças: indiferente (compatível com ou sem crianças em casa).';
      highlights.push(msg);
      criteria.push({ label: LABEL.children, status: 'match', message: msg });
    } else {
      const adopterVal = adopter.hasChildren;
      const preferredBool = preferred === 'SIM';
      if (adopterVal === undefined || adopterVal === null) {
        earnedWeight += 0.5;
        criteria.push({ label: LABEL.children, status: 'neutral', message: 'Você não informou no perfil. O pet ' + (preferredBool ? 'se dá bem com crianças.' : 'prefere lar sem crianças.') });
      } else if (adopterVal === preferredBool) {
        earnedWeight += 1;
        const msg = preferredBool ? 'Crianças em casa, compatível.' : 'Sem crianças, compatível.';
        highlights.push(msg);
        criteria.push({ label: LABEL.children, status: 'match', message: msg });
      } else {
        const msg = preferredBool ? 'Pet se dá bem com crianças; seu perfil indica sem crianças.' : 'Pet prefere lar sem crianças.';
        concerns.push(msg);
        criteria.push({ label: LABEL.children, status: 'mismatch', message: msg });
      }
    }
  }

  // Tempo em casa (MOST_DAY | HALF_DAY | LITTLE | INDIFERENTE)
  if (petPreferences.preferredTutorTimeAtHome != null && petPreferences.preferredTutorTimeAtHome !== '') {
    totalWeight += 1;
    const preferred = petPreferences.preferredTutorTimeAtHome;
    if (preferred === 'INDIFERENTE') {
      earnedWeight += 1;
      const msg = 'Tempo em casa: indiferente (sua rotina atende).';
      highlights.push(msg);
      criteria.push({ label: LABEL.timeAtHome, status: 'match', message: msg });
    } else {
      const adopterVal = adopter.timeAtHome;
      if (adopterVal == null || adopterVal === '') {
        earnedWeight += 0.5;
        criteria.push({ label: LABEL.timeAtHome, status: 'neutral', message: 'Você não informou no perfil. O pet prefere tutor que fica ' + (LABELS.timeAtHome[preferred as keyof typeof LABELS.timeAtHome] ?? preferred) + '.' });
      } else if (adopterVal === preferred) {
        earnedWeight += 1;
        const msg = `Tempo em casa compatível (${LABELS.timeAtHome[preferred as keyof typeof LABELS.timeAtHome] ?? preferred})`;
        highlights.push(msg);
        criteria.push({ label: LABEL.timeAtHome, status: 'match', message: msg });
      } else {
        const msg = `Pet prefere tutor que fica ${LABELS.timeAtHome[preferred as keyof typeof LABELS.timeAtHome] ?? preferred}.`;
        concerns.push(msg);
        criteria.push({ label: LABEL.timeAtHome, status: 'mismatch', message: msg });
      }
    }
  }

  // Pets permitidos no local
  if (petPreferences.preferredTutorPetsAllowedAtHome != null && petPreferences.preferredTutorPetsAllowedAtHome !== '') {
    totalWeight += 1;
    const adopterVal = adopter.petsAllowedAtHome;
    const preferred = petPreferences.preferredTutorPetsAllowedAtHome;
    if (adopterVal == null || adopterVal === '') {
      earnedWeight += 0.5;
      criteria.push({ label: LABEL.petsAllowed, status: 'neutral', message: 'Você não informou no perfil se pets são permitidos no local.' });
    } else if (adopterVal === preferred) {
      earnedWeight += 1;
      const msg = `Pets permitidos no local: ${LABELS.petsAllowed[preferred as keyof typeof LABELS.petsAllowed] ?? preferred}`;
      highlights.push(msg);
      criteria.push({ label: LABEL.petsAllowed, status: 'match', message: msg });
    } else if (preferred === 'YES' && (adopterVal === 'NO' || adopterVal === 'UNSURE')) {
      const msg = 'Pet precisa de local onde pets são permitidos.';
      concerns.push(msg);
      criteria.push({ label: LABEL.petsAllowed, status: 'mismatch', message: msg });
    } else if (preferred === 'NO' && adopterVal === 'YES') {
      const msg = 'Pet prefere tutor em local onde pets não são permitidos (ex.: restrição do condomínio).';
      concerns.push(msg);
      criteria.push({ label: LABEL.petsAllowed, status: 'mismatch', message: msg });
    } else {
      earnedWeight += 0.5;
      criteria.push({ label: LABEL.petsAllowed, status: 'neutral', message: 'Preferência do pet e seu perfil não batem totalmente; considerado neutro.' });
    }
  }

  // Experiência com cachorro
  if (petPreferences.preferredTutorDogExperience != null && petPreferences.preferredTutorDogExperience !== '') {
    totalWeight += 1;
    const adopterVal = adopter.dogExperience;
    const preferred = petPreferences.preferredTutorDogExperience;
    if (adopterVal == null || adopterVal === '') {
      earnedWeight += 0.5;
      criteria.push({ label: LABEL.dogExp, status: 'neutral', message: 'Você não informou no perfil. O pet prefere tutor com experiência: ' + (LABELS.experience[preferred as keyof typeof LABELS.experience] ?? preferred) + '.' });
    } else if (adopterVal === preferred) {
      earnedWeight += 1;
      const msg = `Experiência com cachorro: ${LABELS.experience[preferred as keyof typeof LABELS.experience] ?? preferred}`;
      highlights.push(msg);
      criteria.push({ label: LABEL.dogExp, status: 'match', message: msg });
    } else {
      const order: Record<string, number> = { NEVER: 0, HAD_BEFORE: 1, HAVE_NOW: 2 };
      const a = order[adopterVal] ?? -1;
      const p = order[preferred] ?? -1;
      if (a >= p) {
        earnedWeight += 1;
        const msg = `Experiência com cachorro: ${LABELS.experience[preferred as keyof typeof LABELS.experience] ?? preferred}`;
        highlights.push(msg);
        criteria.push({ label: LABEL.dogExp, status: 'match', message: msg });
      } else {
        const msg = `Pet prefere tutor com experiência com cachorro (${LABELS.experience[preferred as keyof typeof LABELS.experience] ?? preferred}).`;
        concerns.push(msg);
        criteria.push({ label: LABEL.dogExp, status: 'mismatch', message: msg });
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
      criteria.push({ label: LABEL.catExp, status: 'neutral', message: 'Você não informou no perfil. O pet prefere tutor com experiência: ' + (LABELS.experience[preferred as keyof typeof LABELS.experience] ?? preferred) + '.' });
    } else if (adopterVal === preferred) {
      earnedWeight += 1;
      const msg = `Experiência com gato: ${LABELS.experience[preferred as keyof typeof LABELS.experience] ?? preferred}`;
      highlights.push(msg);
      criteria.push({ label: LABEL.catExp, status: 'match', message: msg });
    } else {
      const order: Record<string, number> = { NEVER: 0, HAD_BEFORE: 1, HAVE_NOW: 2 };
      const a = order[adopterVal] ?? -1;
      const p = order[preferred] ?? -1;
      if (a >= p) {
        earnedWeight += 1;
        const msg = `Experiência com gato: ${LABELS.experience[preferred as keyof typeof LABELS.experience] ?? preferred}`;
        highlights.push(msg);
        criteria.push({ label: LABEL.catExp, status: 'match', message: msg });
      } else {
        const msg = `Pet prefere tutor com experiência com gato (${LABELS.experience[preferred as keyof typeof LABELS.experience] ?? preferred}).`;
        concerns.push(msg);
        criteria.push({ label: LABEL.catExp, status: 'mismatch', message: msg });
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
      criteria.push({ label: LABEL.householdAgrees, status: 'neutral', message: 'Você não informou no perfil. O pet prefere que todos em casa concordem com a adoção.' });
    } else if (adopterVal === preferred) {
      earnedWeight += 1;
      const msg = `Concordância em casa: ${LABELS.householdAgrees[preferred as keyof typeof LABELS.householdAgrees] ?? preferred}`;
      highlights.push(msg);
      criteria.push({ label: LABEL.householdAgrees, status: 'match', message: msg });
    } else if (preferred === 'YES' && adopterVal === 'DISCUSSING') {
      const msg = 'Pet prefere que todos em casa já concordem com a adoção.';
      concerns.push(msg);
      criteria.push({ label: LABEL.householdAgrees, status: 'mismatch', message: msg });
    } else {
      earnedWeight += 0.5;
      criteria.push({ label: LABEL.householdAgrees, status: 'neutral', message: 'Preferência do pet e seu perfil não batem totalmente; considerado neutro.' });
    }
  }

  // Espécie do pet × preferência do adotante (speciesPref). BOTH = sempre match.
  const speciesPref = adopter.speciesPref?.toUpperCase?.() ?? null;
  if (petPreferences.species != null && petPreferences.species !== '' && speciesPref) {
    totalWeight += 1;
    const petSpecies = petPreferences.species.toUpperCase();
    if (speciesPref === 'BOTH') {
      earnedWeight += 1;
      const msg = `Você aceita qualquer espécie; este pet é ${LABELS.species[petSpecies as keyof typeof LABELS.species] ?? petSpecies}.`;
      highlights.push(msg);
      criteria.push({ label: LABEL.species, status: 'match', message: msg });
    } else if (petSpecies === speciesPref) {
      earnedWeight += 1;
      const msg = `Espécie compatível com sua preferência (${LABELS.species[speciesPref as keyof typeof LABELS.species] ?? speciesPref}).`;
      highlights.push(msg);
      criteria.push({ label: LABEL.species, status: 'match', message: msg });
    } else {
      const msg = `Você prefere ${LABELS.species[speciesPref as keyof typeof LABELS.species] ?? speciesPref}; este pet é ${LABELS.species[petSpecies as keyof typeof LABELS.species] ?? petSpecies}.`;
      concerns.push(msg);
      criteria.push({ label: LABEL.species, status: 'mismatch', message: msg });
    }
  }

  // Sexo do pet × preferência do adotante (sexPref). both = sempre match.
  const sexPref = adopter.sexPref?.toLowerCase?.() ?? null;
  if (petPreferences.sex != null && petPreferences.sex !== '' && sexPref) {
    totalWeight += 1;
    const petSex = petPreferences.sex.toLowerCase();
    if (sexPref === 'both') {
      earnedWeight += 1;
      const msg = `Você não faz distinção por sexo; este pet é ${LABELS.sex[petSex as keyof typeof LABELS.sex] ?? petSex}.`;
      highlights.push(msg);
      criteria.push({ label: LABEL.sex, status: 'match', message: msg });
    } else if (petSex === sexPref) {
      earnedWeight += 1;
      const msg = `Sexo do pet compatível com sua preferência (${LABELS.sex[sexPref as keyof typeof LABELS.sex] ?? sexPref}).`;
      highlights.push(msg);
      criteria.push({ label: LABEL.sex, status: 'match', message: msg });
    } else {
      const msg = `Você prefere pet ${LABELS.sex[sexPref as keyof typeof LABELS.sex] ?? sexPref}; este pet é ${LABELS.sex[petSex as keyof typeof LABELS.sex] ?? petSex}.`;
      concerns.push(msg);
      criteria.push({ label: LABEL.sex, status: 'mismatch', message: msg });
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
        const msg = `Porte compatível com sua preferência (${petSize}).`;
        highlights.push(msg);
        criteria.push({ label: LABEL.size, status: 'match', message: msg });
      } else {
        const msg = `Você prefere pet ${adopterSizePref}; este pet é ${petSize}.`;
        concerns.push(msg);
        criteria.push({ label: LABEL.size, status: 'mismatch', message: msg });
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
        const msg = `Seu nível de atividade combina com o pet (${LABELS.activity[petEnergy as keyof typeof LABELS.activity] ?? petEnergy}).`;
        highlights.push(msg);
        criteria.push({ label: LABEL.activity, status: 'match', message: msg });
      } else {
        const msg = `Pet é mais ativo (${LABELS.activity[petEnergy as keyof typeof LABELS.activity] ?? petEnergy}) do que seu perfil indica.`;
        concerns.push(msg);
        criteria.push({ label: LABEL.activity, status: 'mismatch', message: msg });
      }
    } else {
      totalWeight += 1;
      earnedWeight += 0.5;
      criteria.push({ label: LABEL.activity, status: 'neutral', message: 'Você não informou nível de atividade no perfil. O pet tem energia ' + (LABELS.activity[petEnergy as keyof typeof LABELS.activity] ?? petEnergy) + '.' });
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
        const msg = `Idade do pet compatível com sua preferência (${LABELS.preferredAge[preferred as keyof typeof LABELS.preferredAge] ?? preferred}).`;
        highlights.push(msg);
        criteria.push({ label: LABEL.age, status: 'match', message: msg });
      } else {
        const msg = `Você prefere pet ${LABELS.preferredAge[preferred as keyof typeof LABELS.preferredAge] ?? preferred}; este tem ${petAge} ano(s).`;
        concerns.push(msg);
        criteria.push({ label: LABEL.age, status: 'mismatch', message: msg });
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
      const msg = 'Você se compromete com cuidados veterinários; o pet tem necessidades que exigem acompanhamento.';
      highlights.push(msg);
      criteria.push({ label: LABEL.vetCare, status: 'match', message: msg });
    } else if (adopterCommits === 'NO') {
      const msg = 'Este pet precisa de acompanhamento veterinário; seu perfil indica que não pode se comprometer com isso.';
      concerns.push(msg);
      criteria.push({ label: LABEL.vetCare, status: 'mismatch', message: msg });
    } else {
      earnedWeight += 0.5;
      criteria.push({ label: LABEL.vetCare, status: 'neutral', message: 'Você não informou no perfil. Este pet tem necessidades que exigem acompanhamento veterinário.' });
    }
  }

  // Frequência de passeios (adotante) × preferência do pet
  if (petPreferences.preferredTutorWalkFrequency != null && petPreferences.preferredTutorWalkFrequency !== '') {
    if (petPreferences.preferredTutorWalkFrequency === 'INDIFERENTE') {
      totalWeight += 1;
      earnedWeight += 1;
      const msg = 'Passeios: indiferente (sua frequência atende).';
      highlights.push(msg);
      criteria.push({ label: LABEL.walkFreq, status: 'match', message: msg });
    } else {
      const preferred = petPreferences.preferredTutorWalkFrequency;
      totalWeight += 1;
      const adopterWalk = adopter.walkFrequency;
      const order = { RARELY: 0, FEW_TIMES_WEEK: 1, DAILY: 2, NOT_APPLICABLE: -1 };
      const a = order[adopterWalk as keyof typeof order] ?? -1;
      const p = order[preferred as keyof typeof order] ?? -1;
      if (adopterWalk == null || adopterWalk === '') {
        earnedWeight += 0.5;
        criteria.push({ label: LABEL.walkFreq, status: 'neutral', message: 'Você não informou no perfil. O pet prefere tutor que passeie ' + (LABELS.walkFreq[preferred as keyof typeof LABELS.walkFreq] ?? preferred) + '.' });
      } else if (adopterWalk === 'NOT_APPLICABLE' && preferred !== 'NOT_APPLICABLE') {
        earnedWeight += 0.5;
        criteria.push({ label: LABEL.walkFreq, status: 'neutral', message: 'Passeios não se aplicam ao seu perfil; o pet prefere tutor que passeie ' + (LABELS.walkFreq[preferred as keyof typeof LABELS.walkFreq] ?? preferred) + '.' });
      } else if (a >= p && a >= 0) {
        earnedWeight += 1;
        const msg = `Frequência de passeios compatível (${LABELS.walkFreq[preferred as keyof typeof LABELS.walkFreq] ?? preferred}).`;
        highlights.push(msg);
        criteria.push({ label: LABEL.walkFreq, status: 'match', message: msg });
      } else {
        const msg = `Pet prefere tutor que passeie com mais frequência (${LABELS.walkFreq[preferred as keyof typeof LABELS.walkFreq] ?? preferred}).`;
        concerns.push(msg);
        criteria.push({ label: LABEL.walkFreq, status: 'mismatch', message: msg });
      }
    }
  }

  // Orçamento (adotante) × pet com gastos contínuos
  if (petPreferences.hasOngoingCosts === true) {
    totalWeight += 1;
    const adopterBudget = adopter.monthlyBudgetForPet;
    if (adopterBudget === 'HIGH' || adopterBudget === 'MEDIUM') {
      earnedWeight += 1;
      const msg = 'Seu orçamento permite arcar com os cuidados contínuos deste pet.';
      highlights.push(msg);
      criteria.push({ label: LABEL.budget, status: 'match', message: msg });
    } else if (adopterBudget === 'LOW') {
      const msg = 'Este pet tem gastos contínuos (ex.: medicação, ração especial); seu orçamento informado é baixo.';
      concerns.push(msg);
      criteria.push({ label: LABEL.budget, status: 'mismatch', message: msg });
    } else {
      earnedWeight += 0.5;
      criteria.push({ label: LABEL.budget, status: 'neutral', message: 'Você não informou orçamento no perfil. Este pet tem gastos contínuos.' });
    }
  }

  if (totalWeight === 0) {
    return { score: null, highlights: [], concerns: [], criteriaCount: 0, criteria: [] };
  }

  const score = Math.round((earnedWeight / totalWeight) * 100);
  return {
    score: Math.min(100, Math.max(0, score)),
    highlights,
    concerns,
    criteriaCount: totalWeight,
    criteria,
  };
}
