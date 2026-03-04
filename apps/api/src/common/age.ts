/**
 * Helpers para validação de idade (ex.: adoção apenas para maiores de 18 anos).
 */

/**
 * Calcula a idade em anos completos na data de referência (hoje por padrão).
 * birthDate em UTC; considera apenas ano/mês/dia para evitar efeito de fuso.
 */
export function getAgeInYears(birthDate: Date | null | undefined, referenceDate = new Date()): number | null {
  if (birthDate == null) return null;
  const b = new Date(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  const r = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  if (b.getTime() > r.getTime()) return null;
  let years = r.getFullYear() - b.getFullYear();
  if (r.getMonth() < b.getMonth() || (r.getMonth() === b.getMonth() && r.getDate() < b.getDate())) {
    years -= 1;
  }
  return years;
}

/** Retorna true se a pessoa tem 18 anos ou mais. Se birthDate for null/undefined, retorna false (exige data cadastrada). */
export function isAtLeast18(birthDate: Date | null | undefined, referenceDate = new Date()): boolean {
  const age = getAgeInYears(birthDate, referenceDate);
  return age !== null && age >= 18;
}
