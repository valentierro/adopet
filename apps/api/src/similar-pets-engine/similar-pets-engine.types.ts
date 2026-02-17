/** Atributos mínimos do pet para calcular similaridade */
export interface PetSimilarityProfile {
  id: string;
  species: string;
  size: string;
  age: number;
  sex: string;
  energyLevel?: string | null;
  temperament?: string | null;
  breed?: string | null;
}

/** Item retornado pela engine: id do pet e score de similaridade (0–100) */
export interface SimilarPetScoreItem {
  petId: string;
  similarityScore: number;
}
