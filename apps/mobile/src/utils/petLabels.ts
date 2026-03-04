/**
 * Labels para exibição de espécie, tamanho e sexo do pet.
 */

export function getSpeciesLabel(species: string | null | undefined): string {
  if (species == null || species === '') return '';
  const s = String(species).toLowerCase();
  if (s === 'dog' || s === 'cachorro') return 'Cachorro';
  if (s === 'cat' || s === 'gato') return 'Gato';
  if (s === 'both' || s === 'qualquer') return 'Qualquer';
  return 'Pet';
}

export function getSizeLabel(size: string | null | undefined): string {
  if (size == null || size === '') return '';
  const s = String(size).toLowerCase();
  if (s === 'small') return 'Pequeno';
  if (s === 'medium') return 'Médio';
  if (s === 'large') return 'Grande';
  if (s === 'xlarge') return 'Muito grande';
  if (s === 'both') return 'Qualquer';
  return '';
}

export function getSexLabel(sex: string | null | undefined): string {
  if (sex == null || sex === '') return '';
  const s = String(sex).toLowerCase();
  if (s === 'male') return 'Macho';
  if (s === 'female') return 'Fêmea';
  if (s === 'both') return 'Indiferente';
  return '';
}
