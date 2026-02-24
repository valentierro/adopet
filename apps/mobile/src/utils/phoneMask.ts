/**
 * Máscara e helpers para telefone (BR: (11) 98765-4321).
 */

/** Retorna apenas os dígitos do telefone (para enviar à API). */
export function getPhoneDigits(value: string): string {
  return (value || '').replace(/\D/g, '');
}

/** Formata o valor enquanto o usuário digita: (11) 98765-4321 (máx. 15 caracteres exibidos). */
export function formatPhoneInput(value: string): string {
  const digits = getPhoneDigits(value);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/** Formata para exibição: (11) 98765-4321 ou vazio. */
export function formatPhoneDisplay(value: string | null | undefined): string {
  if (value == null || value === '') return '';
  const digits = getPhoneDigits(value);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}
