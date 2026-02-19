/**
 * Perfil do adotante (campos de triagem do User + UserPreferences usados no match).
 */
export interface AdopterProfile {
  housingType?: string | null;
  hasYard?: boolean | null;
  hasOtherPets?: boolean | null;
  hasChildren?: boolean | null;
  timeAtHome?: string | null;
  petsAllowedAtHome?: string | null;
  dogExperience?: string | null;
  catExperience?: string | null;
  householdAgreesToAdoption?: string | null;
  /** Preferência de porte (de UserPreferences.sizePref): BOTH | small | medium | large | xlarge */
  sizePref?: string | null;
  /** Preferência de espécie (de UserPreferences.species): DOG | CAT | BOTH */
  speciesPref?: string | null;
  /** Preferência de sexo do pet (de UserPreferences.sexPref): BOTH | male | female */
  sexPref?: string | null;
  /** Nível de atividade: LOW | MEDIUM | HIGH */
  activityLevel?: string | null;
  /** Idade preferida do pet: PUPPY | ADULT | SENIOR | ANY */
  preferredPetAge?: string | null;
  /** Compromisso com cuidados veterinários: YES | NO */
  commitsToVetCare?: string | null;
  /** Frequência de passeios: DAILY | FEW_TIMES_WEEK | RARELY | NOT_APPLICABLE */
  walkFrequency?: string | null;
  /** Orçamento mensal para o pet: LOW | MEDIUM | HIGH */
  monthlyBudgetForPet?: string | null;
}

/**
 * Preferência de tutor do pet + atributos do pet usados no match (campos opcionais; null = indiferente).
 */
export interface PetTutorPreferences {
  preferredTutorHousingType?: string | null;
  /** SIM | NAO | INDIFERENTE */
  preferredTutorHasYard?: string | null;
  /** SIM | NAO | INDIFERENTE */
  preferredTutorHasOtherPets?: string | null;
  /** SIM | NAO | INDIFERENTE */
  preferredTutorHasChildren?: string | null;
  /** MOST_DAY | HALF_DAY | LITTLE | INDIFERENTE */
  preferredTutorTimeAtHome?: string | null;
  preferredTutorPetsAllowedAtHome?: string | null;
  preferredTutorDogExperience?: string | null;
  preferredTutorCatExperience?: string | null;
  preferredTutorHouseholdAgrees?: string | null;
  preferredTutorWalkFrequency?: string | null;
  hasOngoingCosts?: boolean | null;
  /** Atributos do pet para match: espécie, sexo, porte, idade, energia, necessidades especiais */
  species?: string | null;
  sex?: string | null;
  size?: string | null;
  age?: number | null;
  energyLevel?: string | null;
  hasSpecialNeeds?: boolean | null;
  healthNotes?: string | null;
}

export type MatchCriterionStatus = 'match' | 'mismatch' | 'neutral';

export interface MatchCriterion {
  /** Nome curto do critério (ex.: "Moradia", "Quintal"). */
  label: string;
  /** match = compatível, mismatch = incompatível, neutral = não informado no perfil. */
  status: MatchCriterionStatus;
  /** Mensagem explicativa (igual às usadas em highlights/concerns ou "Não informado no perfil"). */
  message: string;
}

export interface MatchResult {
  /** Score 0–100 (ou null se não houver critérios de preferência no pet). */
  score: number | null;
  /** Mensagens positivas (ex.: "Moradia compatível"). */
  highlights: string[];
  /** Pontos de atenção (ex.: "Pet prefere tutor com quintal"). */
  concerns: string[];
  /** Quantidade de critérios do pet que foram considerados (com preferência definida). */
  criteriaCount: number;
  /** Todos os critérios avaliados: match, mismatch e neutral (para exibir no modal). */
  criteria: MatchCriterion[];
}
