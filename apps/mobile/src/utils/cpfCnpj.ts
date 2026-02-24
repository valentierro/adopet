/**
 * Validação de CPF e CNPJ (dígitos verificadores).
 * Mesma lógica da API (apps/api/src/common/cpf-cnpj.ts).
 * Rejeita sequências repetidas (111.111.111-11, 00.000.000/0001-91, etc.).
 */

export function isValidCpf(cpf: string): boolean {
  const d = String(cpf).replace(/\D/g, '');
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

export function isValidCnpj(cnpj: string): boolean {
  const d = String(cnpj).replace(/\D/g, '');
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

/** Retorna true se o documento (11 ou 14 dígitos) é um CPF ou CNPJ válido. */
export function isValidCpfOrCnpj(document: string): boolean {
  const d = String(document).replace(/\D/g, '');
  if (d.length === 11) return isValidCpf(d);
  if (d.length === 14) return isValidCnpj(d);
  return false;
}
