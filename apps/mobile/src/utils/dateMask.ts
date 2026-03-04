/**
 * Máscara e helpers para data no formato brasileiro DD/MM/AAAA.
 */

/** Retorna apenas os dígitos da string (para data: DDMMAAAA). */
function getDateDigits(value: string): string {
  return (value || '').replace(/\D/g, '');
}

/**
 * Formata o valor enquanto o usuário digita: DD/MM/AAAA (máx. 10 caracteres + 2 barras).
 * Aceita apenas números; insere as barras automaticamente.
 */
export function formatDateInputDDMMAAAA(value: string): string {
  const digits = getDateDigits(value).slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Converte data no formato DD/MM/AAAA para ISO AAAA-MM-DD (para enviar à API).
 * Retorna null se a data estiver incompleta ou inválida.
 */
export function parseDDMMAAAAToISO(ddmmaaaa: string | null | undefined): string | null {
  if (ddmmaaaa == null || ddmmaaaa === '') return null;
  const digits = getDateDigits(ddmmaaaa);
  if (digits.length !== 8) return null;
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const aaaa = digits.slice(4, 8);
  const day = parseInt(dd, 10);
  const month = parseInt(mm, 10);
  const year = parseInt(aaaa, 10);
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) return null;
  return `${aaaa}-${mm}-${dd}`;
}

/**
 * Converte data em ISO (AAAA-MM-DD) para exibição DD/MM/AAAA.
 * Se o valor já estiver em DD/MM/AAAA, retorna como está.
 */
export function formatDateToDDMMAAAA(value: string | null | undefined): string {
  if (value == null || value === '') return '';
  const trimmed = value.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  return trimmed;
}
