/**
 * Validação de CPF e CNPJ (dígitos verificadores).
 * Rejeita sequências repetidas (111.111.111-11, 00.000.000/0000-00, etc.).
 */

/**
 * Valida CPF (11 dígitos). Retorna true apenas se o formato e os dígitos verificadores estiverem corretos.
 */
export function isValidCpf(digits: string): boolean {
  const d = digits.replace(/\D/g, '');
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * parseInt(d[i]!, 10);
  let dig = (sum * 10) % 11;
  if (dig === 10) dig = 0;
  if (dig !== parseInt(d[9]!, 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += (11 - i) * parseInt(d[i]!, 10);
  dig = (sum * 10) % 11;
  if (dig === 10) dig = 0;
  return dig === parseInt(d[10]!, 10);
}

/**
 * Valida CNPJ (14 dígitos). Retorna true apenas se o formato e os dígitos verificadores estiverem corretos.
 */
export function isValidCnpj(digits: string): boolean {
  const d = digits.replace(/\D/g, '');
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += w1[i]! * parseInt(d[i]!, 10);
  let dig = sum % 11;
  dig = dig < 2 ? 0 : 11 - dig;
  if (dig !== parseInt(d[12]!, 10)) return false;
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) sum += w2[i]! * parseInt(d[i]!, 10);
  dig = sum % 11;
  dig = dig < 2 ? 0 : 11 - dig;
  return dig === parseInt(d[13]!, 10);
}

/**
 * Valida documento: CPF (11 dígitos) ou CNPJ (14 dígitos).
 */
export function isValidCpfOrCnpj(digits: string): boolean {
  const d = digits.replace(/\D/g, '');
  if (d.length === 11) return isValidCpf(d);
  if (d.length === 14) return isValidCnpj(d);
  return false;
}
