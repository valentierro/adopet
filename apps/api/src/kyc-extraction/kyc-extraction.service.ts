import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { isAtLeast18 } from '../common/age';
import { InAppNotificationsService, IN_APP_NOTIFICATION_TYPES } from '../notifications/in-app-notifications.service';
import { AdminService } from '../admin/admin.service';

const VISION_ANNOTATE_URL = 'https://vision.googleapis.com/v1/images:annotate';

/** Status da extração OCR da data de nascimento no documento KYC. */
export const KYC_EXTRACTION_STATUS = {
  PENDING: 'PENDING', // ainda não executou
  OK: 'OK', // extraiu e confere com cadastro (mesma data, 18+)
  DIVERGENT: 'DIVERGENT', // extraiu mas não confere com cadastro ou documento indica <18
  NOT_EXTRACTED: 'NOT_EXTRACTED', // não conseguiu extrair data do documento
} as const;

/** Sinal de possível fraude para alertar admins (in-app + push). */
export const KYC_FRAUD_SIGNAL = {
  CPF_DIVERGENT: 'CPF_DIVERGENT', // nome bate, CPF do documento não confere com cadastro
  RG_DIVERGENT: 'RG_DIVERGENT', // nome/data batem, RG do documento não confere
  NAME_DIVERGENT: 'NAME_DIVERGENT', // nome do documento não confere com cadastro
  BIRTH_DATE_OR_AGE_DIVERGENT: 'BIRTH_DATE_OR_AGE_DIVERGENT', // data ou idade no doc não confere
} as const;
export type KycFraudSignal = (typeof KYC_FRAUD_SIGNAL)[keyof typeof KYC_FRAUD_SIGNAL];

const FRAUD_SIGNAL_LABELS: Record<KycFraudSignal, string> = {
  [KYC_FRAUD_SIGNAL.CPF_DIVERGENT]: 'Nome bate, documento (CPF) não confere',
  [KYC_FRAUD_SIGNAL.RG_DIVERGENT]: 'Nome/data batem, RG do documento não confere',
  [KYC_FRAUD_SIGNAL.NAME_DIVERGENT]: 'Nome do documento não confere com o cadastro',
  [KYC_FRAUD_SIGNAL.BIRTH_DATE_OR_AGE_DIVERGENT]: 'Data de nascimento ou idade no documento não confere',
};

/** Ano máximo plausível para nascimento (ex.: 2007 = 18+ em 2025). */
const MAX_BIRTH_YEAR = 2008;

/**
 * Corrige trocas comuns de OCR em contexto de data: O→0, I/l→1 (ex.: 27/O7/1985, I985).
 * Aplica apenas onde há dígitos e separadores para não alterar palavras.
 */
function fixOcrDigitsInDateContext(s: string): string {
  return s
    .replace(/(\d)([Oo])(\d)/g, '$10$3')
    .replace(/([\/\-\.])([Oo])(\d)/g, '$10$3')
    .replace(/(\d)([Oo])([\/\-\.])/g, '$10$3')
    .replace(/(^|\D)([Il])(\d{3})\b/g, '$11$3')
    .replace(/(\d)([Il])(\d{2})\b/g, '$11$3')
    .replace(/(\d{2})([Il])(\d)\b/g, '$11$3');
}

/**
 * Extrai data de nascimento do texto OCR (RG/CNH: "Nascimento" ou "Data de nascimento" + DD/MM/AAAA).
 * Retorna ISO (YYYY-MM-DD) ou null.
 */
function parseBirthDateFromOcrText(text: string): string | null {
  if (!text || typeof text !== 'string') return null;
  // Normaliza espaços e barras Unicode (fullwidth, etc.) para ASCII
  let normalized = text.replace(/\s+/g, ' ').trim();
  normalized = normalized.replace(/[\u2044\u2215\uFF0F]/g, '/'); // fraction slash, division slash, fullwidth solidus → /
  const normalizedFixed = fixOcrDigitsInDateContext(normalized);

  const parseDmy = (d: string, m: string, yyyy: string): string | null => {
    const year = parseInt(yyyy, 10);
    if (year < 1940 || year > MAX_BIRTH_YEAR) return null;
    const dd = d.padStart(2, '0');
    const mm = m.padStart(2, '0');
    const day = parseInt(d, 10);
    const month = parseInt(m, 10);
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    return `${yyyy}-${mm}-${dd}`;
  };

  const searchIn = (str: string): string | null => {
    // CNH: "3 DATA, LOCAL E UF DE NASCIMENTO" seguido de "27/07/1985, RIBEIRAO, PE"
    const nascRegex = /(?:nascimento|nasc\.?|data\s*de\s*nascimento|de\s*nascimento|data\s*,\s*local\s*e\s*uf\s*de\s*nascimento|nasc\.?\s*\/?)\s*:?\s*(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{4})/i;
    const nascMatch = str.match(nascRegex);
    if (nascMatch) {
      const iso = parseDmy(nascMatch[1], nascMatch[2], nascMatch[3]);
      if (iso) return iso;
    }
    const sepRegex = /(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{4})/g;
    for (const m of str.matchAll(sepRegex)) {
      const iso = parseDmy(m[1], m[2], m[3]);
      if (iso) return iso;
    }
    const spaceRegex = /(\d{1,2})\s+(\d{1,2})\s+(\d{4})/g;
    for (const m of str.matchAll(spaceRegex)) {
      const iso = parseDmy(m[1], m[2], m[3]);
      if (iso) return iso;
    }
    const compactRegex = /\b(\d{2})(\d{2})(\d{4})\b/g;
    for (const m of str.matchAll(compactRegex)) {
      const iso = parseDmy(m[1], m[2], m[3]);
      if (iso) return iso;
    }
    return null;
  };

  const fromOriginal = searchIn(normalized);
  if (fromOriginal) return fromOriginal;
  return searchIn(normalizedFixed);
}

/**
 * Compara data extraída do documento (ISO) com a data do cadastro (Date).
 * Usa UTC para evitar que timezone do servidor mude o dia (ex.: 1985-07-27 00:00 UTC → 26/07 em UTC-3).
 */
function sameDate(extractedIso: string, userBirthDate: Date): boolean {
  const y = userBirthDate.getUTCFullYear();
  const m = String(userBirthDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(userBirthDate.getUTCDate()).padStart(2, '0');
  const userIso = `${y}-${m}-${d}`;
  return extractedIso.slice(0, 10) === userIso;
}

/** Normaliza nome para comparação: minúsculo, sem acentos, espaços colapsados. */
function normalizeNameForCompare(s: string): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Stopwords que podem aparecer no nome e não precisam bater no documento (ex.: "Erick dos Santos" vs doc "Erick ... Santos"). */
const NAME_STOPWORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'el', 'la']);

/**
 * Verifica se o nome do cadastro bate com o nome extraído do documento.
 * Regra: pelo menos 2 nomes (tokens) do cadastro devem bater no doc.
 * Ex.: "Erick Santos" / "Erick henrique" / "erick valentin" = ok; "erick" só = nok; "erick xyz" = nok.
 */
function namesMatch(extracted: string, user: string): boolean {
  const docNorm = normalizeNameForCompare(extracted);
  const userNorm = normalizeNameForCompare(user);
  if (!docNorm || !userNorm) return true; // não comparar se vazio
  const docTokens = docNorm.split(/\s+/).filter(Boolean);
  const userTokens = userNorm.split(/\s+/).filter((t) => t.length >= 2 && !NAME_STOPWORDS.has(t));
  if (userTokens.length === 0) return true;
  // Exige pelo menos 2 nomes (tokens) do cadastro para considerar válido; 1 só (ex.: "erick") = nok
  if (userTokens.length < 2) return false;
  const docSet = new Set(docTokens);
  const matchCount = userTokens.filter((t) => docSet.has(t)).length;
  if (matchCount >= 2) return true;
  // Fallback: primeiro e último token do cadastro batem (ex.: Erick e Santos)
  const first = userTokens[0]!;
  const last = userTokens[userTokens.length - 1]!;
  if (docSet.has(first) && docSet.has(last)) return true;
  return false;
}

/** Extrai nome do portador do texto OCR (RG/CNH: "NOME" ou CNH "2 e 1 NOME E SOBRENOME" seguido do nome). */
function parseNameFromOcrText(text: string): string | null {
  if (!text || typeof text !== 'string') return null;
  const normalized = text.replace(/\s+/g, ' ').trim();
  // CNH: "2 e 1 NOME E SOBRENOME" ou "NOME E SOBRENOME" seguido do nome; termina ao encontrar " 3 " (DATA) ou filiação/data/cpf (case-insensitive)
  const cnhMatch = normalized.match(
    /(?:(?:2\s*e\s*1)\s+)?nome\s+e\s+sobrenome\s*[:.\/\s]*([A-Za-zÀ-ÿ\s]{4,80}?)(?=\s*\d\s*(?:DATA|,\s*LOCAL|filia|nasc|data|cpf|rg)|$)/i,
  );
  if (cnhMatch?.[1]) {
    const name = cnhMatch[1].replace(/\s+/g, ' ').trim();
    if (name.length >= 4) return name;
  }
  // Fallback: após "NOME E SOBRENOME" ou "2 e 1", captura sequência de letras/espaços até um dígito (ex.: " 3 DATA")
  const cnhFallback = normalized.match(
    /(?:2\s*e\s*1\s+)?nome\s+e\s+sobrenome\s*[:.\/\s]*([A-Za-zÀ-ÿ\s]{10,80}?)\s+(?=\d)/i,
  );
  if (cnhFallback?.[1]) {
    const name = cnhFallback[1].replace(/\s+/g, ' ').trim();
    if (name.length >= 4) return name;
  }
  // Padrão RG: NOME seguido de << NOME COMPLETO >> (ex.: "<< ERICK HENRIQUE VALENTIM DOS SANTOS >>")
  const rgAngleMatch = normalized.match(/\bnome\s*[:\s]*<<\s*([A-Za-zÀ-ÿ\s]{4,80}?)\s*>>/i);
  if (rgAngleMatch?.[1]) {
    const name = rgAngleMatch[1].replace(/\s+/g, ' ').trim();
    if (name.length >= 4) return name;
  }
  // RG: << NOME >> pode estar sem "NOME" na mesma linha (Vision junta diferente); captura entre << e >>
  const onlyAngleMatch = normalized.match(/<<\s*([A-Za-zÀ-ÿ\s]{10,80}?)\s*>>/);
  if (onlyAngleMatch?.[1]) {
    const candidate = onlyAngleMatch[1].replace(/\s+/g, ' ').trim();
    if (candidate.length >= 10 && /^[A-Za-zÀ-ÿ\s]+$/.test(candidate) && candidate.split(/\s+/).length >= 2) return candidate;
  }
  // RG: NOME seguido do nome na mesma linha (sem << >>), até FILIAÇÃO/DATA/CPF
  const rgInlineMatch = normalized.match(
    /\bnome\s+([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+){2,})\s*(?=filia|data\s*de|data\s*exped|cpf|rg\b|\d{2}\/\d{2})/i,
  );
  if (rgInlineMatch?.[1]) {
    const name = rgInlineMatch[1].replace(/\s+/g, ' ').trim();
    if (name.length >= 6) return name;
  }
  // Padrão RG: NOME ou Nome completo seguido de : e depois letras (sem << >>)
  const match = normalized.match(
    /(?:nome\s*(?:completo|do\s*portador)?|nome)\s*[:.]?\s*([A-Za-zÀ-ÿ\s]{4,60}?)(?=\s*(?:filia[cç]|nasc|data|cpf|rg|registro|\d{2}\/\d{2})|$)/i,
  );
  if (match?.[1]) {
    const name = match[1].replace(/\s+/g, ' ').trim();
    if (name.length >= 4) return name;
  }
  return null;
}

/**
 * Extrai CPF do texto (11 dígitos). Prioriza número que aparece após a palavra "CPF" no documento (RG/CNH).
 * Retorna só dígitos ou null.
 */
function parseCpfFromOcrText(text: string): string | null {
  if (!text || typeof text !== 'string') return null;
  const normalized = text.replace(/\s+/g, ' ').trim();
  // Primeiro: CPF escrito no doc (ex.: "CPF 123.456.789-01" ou "CPF Nº 12345678901")
  const afterCpf = normalized.match(/(?:^|\s)cpf\s*[nº.:]*\s*([\d.\-\s]{11,20})/i);
  if (afterCpf?.[1]) {
    const digits = afterCpf[1].replace(/\D/g, '');
    if (digits.length === 11) return digits;
  }
  // Fallback: primeira sequência de 11 dígitos (com ou sem formatação)
  const match = normalized.match(/\b(\d[\d.\-\s]{9,13}\d)\b/);
  if (match?.[1]) {
    const digits = match[1].replace(/\D/g, '');
    if (digits.length === 11) return digits;
  }
  const all = text.replace(/\D/g, '');
  const eleven = all.match(/(\d{11})/);
  return eleven ? eleven[1] : null;
}

/** Resultado da extração do número do documento: valor normalizado e origem (RG ou CNH). */
type ExtractedDocNumber = { value: string; source: 'RG' | 'CNH' };

/**
 * Extrai número do documento (RG ou CNH) do texto.
 * RG: usado para comparar com user.rg quando o usuário enviou carteira de identidade.
 * CNH: número da CNH (não comparamos com user.rg; o CPF da CNH já é comparado com user.document).
 */
function parseDocNumberFromOcrText(text: string): ExtractedDocNumber | null {
  if (!text || typeof text !== 'string') return null;
  const minRgDigits = 5;
  const normRg = (raw: string): { value: string; digits: string } | null => {
    const t = raw.replace(/\s/g, '').trim();
    const digits = t.replace(/[^0-9]/g, '');
    const letter = t.match(/([A-Za-z])$/)?.[1] ?? '';
    const value = (digits + letter).slice(0, 20);
    return value.length >= 4 ? { value, digits } : null;
  };

  const normalizedForDoc = text.replace(/\s+/g, ' ').trim();
  const isLikelyCnh = /CARTEIRA\s*NACIONAL|HABILITA[CÇ][AÃ]O|DOC\s*\.?\s*IDENTIDADE/i.test(normalizedForDoc);

  // 1) CNH: campo "4c DOC IDENTIDADE / ORG EMISSOR / UF" → número do RG no doc (6827207 ou 6.827.207).
  const docIdentidadeMatch = normalizedForDoc.match(/(?:4\s*[cC]\s*)?DOC\s*\.?\s*IDENTIDADE\s*[\/:\s]*([\d.]+)(?=\s*[A-Z]|\s*$)/i);
  if (docIdentidadeMatch?.[1]) {
    const digitsOnly = docIdentidadeMatch[1].replace(/[^0-9]/g, '');
    if (digitsOnly.length >= minRgDigits) return { value: digitsOnly, source: 'RG' };
  }
  // 1b) CNH: fallback — número (5–10 dígitos) seguido de "SDS" ou "PE" (ex.: "6827207 SDS PE" no campo DOC IDENTIDADE)
  if (isLikelyCnh) {
    const docNumBeforeOrg = normalizedForDoc.match(/\b(\d{5,10})\s+(?:SDS|PE|ORG|EMISSOR)\b/i);
    if (docNumBeforeOrg?.[1]) return { value: docNumBeforeOrg[1], source: 'RG' };
  }

  // 2) RG (carteira de identidade): "REGISTRO GERAL" / "RG" seguido do número (6.827.207 ou 6827207)
  const rgExplicitRe = /(?:RG|registro\s*geral)\s*[:\s.]*([\d.\-\s]{5,20}[A-Za-z]?)/gi;
  for (const m of text.matchAll(rgExplicitRe)) {
    const cap = m[1];
    if (cap) {
      const n = normRg(cap);
      if (n && n.digits.length >= minRgDigits) return { value: n.value, source: 'RG' };
    }
  }
  const rgMatch = text.match(/(?:RG|registro|n[º°]?)\s*[:.]?\s*([\d.\-\s]{5,20}[A-Za-z]?)/i);
  if (rgMatch?.[1]) {
    const n = normRg(rgMatch[1]);
    if (n && n.digits.length >= minRgDigits) return { value: n.value, source: 'RG' };
  }

  // 3) RG (carteira de identidade) formato com pontos (6.827.207): só quando o texto é de RG, não CNH (evitar "N° REGISTRO" da CNH).
  if (!isLikelyCnh && /REGISTRO\s+GERAL|NOME\s*<<|<<\s*[A-Z]/i.test(normalizedForDoc)) {
    const rgWithDots = normalizedForDoc.match(/\b(\d{1,2}\.\d{3}\.\d{3})\b/);
    if (rgWithDots?.[1]) {
      const digitsOnly = rgWithDots[1].replace(/[^0-9]/g, '');
      if (digitsOnly.length >= minRgDigits) return { value: digitsOnly, source: 'RG' };
    }
  }

  // 4) CNH: número de 11 dígitos "N° REGISTRO" (número da habilitação) só quando é CNH e não temos DOC IDENTIDADE (doc antigo sem esse campo).
  if (isLikelyCnh) {
    const cnhMatch = normalizedForDoc.match(/(?:5\s*n[º°]?\s*registro|n[º°]?\s*(?:do\s*documento)?)\s*[:.]?\s*(\d[\d.\-\s]{8,15}\d)/i);
    if (cnhMatch?.[1]) {
      const digits = cnhMatch[1].replace(/[^0-9]/g, '');
      if (digits.length >= 9 && digits.length <= 11) return { value: digits.slice(-11), source: 'CNH' };
    }
  }
  return null;
}

/**
 * Normaliza número de documento (RG/CNH) para comparação e armazenamento.
 * Remove pontos, espaços, traços, vírgulas (ex.: "6.827.207" e "6827207" viram "6827207").
 * Mantém só dígitos ASCII + opcional letra final (RG pode ter dígito verificador alfabético).
 */
function normalizeDocNumber(s: string): string {
  const t = String(s ?? '').replace(/\s/g, '').toUpperCase().trim();
  const digits = t.replace(/[^0-9]/g, '');
  const letter = t.match(/([A-Z])$/)?.[1] ?? '';
  return (digits + letter).slice(0, 20);
}

/** Alias para uso em comparação RG. */
function normalizeRgForCompare(s: string): string {
  return normalizeDocNumber(s);
}

@Injectable()
export class KycExtractionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
    private readonly config: ConfigService,
    private readonly inAppNotifications: InAppNotificationsService,
    private readonly adminService: AdminService,
  ) {}

  /**
   * Extrai texto da imagem usando Google Cloud Vision API (DOCUMENT_TEXT_DETECTION).
   * Retorna null em caso de falha ou se GOOGLE_VISION_API_KEY não estiver configurado.
   */
  private async extractTextWithGoogleVision(buffer: Buffer): Promise<string | null> {
    const apiKey = this.config.get<string>('GOOGLE_VISION_API_KEY')?.trim();
    if (!apiKey) return null;

    const base64 = buffer.toString('base64');

    const runRequest = async (featureType: 'DOCUMENT_TEXT_DETECTION' | 'TEXT_DETECTION') => {
      const body = {
        requests: [{ image: { content: base64 }, features: [{ type: featureType, maxResults: 1 }] }],
      };
      const res = await fetch(`${VISION_ANNOTATE_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.warn('[KycExtraction] Google Vision API error', res.status, featureType, errText.slice(0, 200));
        return null;
      }
      const data = (await res.json()) as {
        responses?: Array<{
          fullTextAnnotation?: { text?: string };
          textAnnotations?: Array<{ description?: string }>;
        }>;
      };
      const first = data.responses?.[0];
      if (!first) return null;
      const fullText = first.fullTextAnnotation?.text?.trim();
      if (fullText) return fullText;
      const firstBlock = first.textAnnotations?.[0]?.description?.trim();
      if (firstBlock) return firstBlock;
      const combined = first.textAnnotations?.slice(1).map((a) => a.description ?? '').join(' ').trim();
      return combined || null;
    };

    try {
      let out = await runRequest('DOCUMENT_TEXT_DETECTION');
      if (!out) out = await runRequest('TEXT_DETECTION');
      return out;
    } catch (err) {
      console.warn('[KycExtraction] Google Vision request failed', err);
      return null;
    }
  }

  /** Extrai texto do buffer (Vision + Tesseract fallback). */
  private async extractTextFromBuffer(buffer: Buffer, userId: string, label: string): Promise<string> {
    let text = '';
    const visionText = await this.extractTextWithGoogleVision(buffer);
    if (visionText) {
      text = visionText;
      console.log('[KycExtraction]', label, 'Google Vision OK, text length:', text.length, 'userId:', userId);
    }
    if (!text) {
      console.log('[KycExtraction]', label, 'Vision empty/failed, trying Tesseract userId:', userId);
      try {
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('por', undefined, { logger: () => {} });
        try {
          const result = await worker.recognize(buffer);
          text = (result?.data?.text ?? '') as string;
          console.log('[KycExtraction]', label, 'Tesseract OK, text length:', text.length, 'userId:', userId);
        } finally {
          await worker.terminate();
        }
      } catch (err) {
        console.warn('[KycExtraction]', label, 'Tesseract failed for user', userId, err);
      }
    }
    return text;
  }

  /**
   * Executa extração OCR no documento KYC: nome, CPF, nº doc e data de nascimento.
   * Compara com cadastro (name, document, rg, birthDate) e atualiza status.
   */
  async runExtraction(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        document: true,
        rg: true,
        birthDate: true,
        kycSelfieKey: true,
        kycDocumentVersoKey: true,
        kycStatus: true,
      },
    });
    if (!user || user.kycStatus !== 'PENDING') return;
    const selfieKey = user.kycSelfieKey;
    if (!selfieKey?.trim()) {
      await this.setExtractionResult(userId, {
        extractedBirthDate: null,
        extractedName: null,
        extractedCpf: null,
        extractedDocNumber: null,
        status: KYC_EXTRACTION_STATUS.PENDING,
      });
      return;
    }

    const keysToTry: { key: string; label: string }[] = [{ key: selfieKey, label: 'Selfie' }];
    if (user.kycDocumentVersoKey?.trim()) {
      keysToTry.push({ key: user.kycDocumentVersoKey.trim(), label: 'Verso' });
    }

    let combinedText = '';
    for (const { key, label } of keysToTry) {
      let buffer: Buffer | null = null;
      try {
        buffer = await this.uploadsService.getObjectBuffer(key);
      } catch (err) {
        console.warn('[KycExtraction] getObjectBuffer failed for', label, 'user', userId, err);
        continue;
      }
      if (!buffer || buffer.length === 0) continue;
      const part = await this.extractTextFromBuffer(buffer, userId, label);
      if (part) combinedText += '\n' + part;
    }

    const extractedBirthIso = parseBirthDateFromOcrText(combinedText);
    const extractedName = parseNameFromOcrText(combinedText);
    const extractedCpf = parseCpfFromOcrText(combinedText);
    const extractedDoc = parseDocNumberFromOcrText(combinedText);
    const extractedDocNumberValue = extractedDoc ? normalizeDocNumber(extractedDoc.value) : null;

    if (!extractedBirthIso) {
      console.warn('[KycExtraction] Could not parse birth date. userId:', userId);
      await this.setExtractionResult(userId, {
        extractedBirthDate: null,
        extractedName: extractedName ?? null,
        extractedCpf: extractedCpf ?? null,
        extractedDocNumber: extractedDocNumberValue,
        status: KYC_EXTRACTION_STATUS.NOT_EXTRACTED,
      });
      return;
    }

    const extractedDate = new Date(extractedBirthIso);
    if (isNaN(extractedDate.getTime())) {
      await this.setExtractionResult(userId, {
        extractedBirthDate: null,
        extractedName: extractedName ?? null,
        extractedCpf: extractedCpf ?? null,
        extractedDocNumber: extractedDocNumberValue,
        status: KYC_EXTRACTION_STATUS.NOT_EXTRACTED,
      });
      return;
    }

    const userBirthDate = user.birthDate;
    if (!userBirthDate) {
      console.log('[KycExtraction] User has no birthDate in profile → DIVERGENT. userId:', userId);
      await this.setExtractionResult(userId, {
        extractedBirthDate: extractedDate,
        extractedName: extractedName ?? null,
        extractedCpf: extractedCpf ?? null,
        extractedDocNumber: extractedDocNumberValue,
        status: KYC_EXTRACTION_STATUS.DIVERGENT,
        fraudSignal: KYC_FRAUD_SIGNAL.BIRTH_DATE_OR_AGE_DIVERGENT,
      });
      return;
    }

    const datesMatch = sameDate(extractedBirthIso, userBirthDate);
    const extractedIs18Plus = isAtLeast18(extractedDate);
    if (!datesMatch || !extractedIs18Plus) {
      console.log('[KycExtraction] DIVERGENT (birth date or age). userId:', userId);
      await this.setExtractionResult(userId, {
        extractedBirthDate: extractedDate,
        extractedName: extractedName ?? null,
        extractedCpf: extractedCpf ?? null,
        extractedDocNumber: extractedDocNumberValue,
        status: KYC_EXTRACTION_STATUS.DIVERGENT,
        fraudSignal: KYC_FRAUD_SIGNAL.BIRTH_DATE_OR_AGE_DIVERGENT,
      });
      return;
    }

    // Nome: cadastro pode ser abreviado (ex.: "Erick Santos") e doc com nome completo → OK
    if (extractedName && !namesMatch(extractedName, user.name)) {
      console.log('[KycExtraction] DIVERGENT (name). extracted:', extractedName, 'user:', user.name, 'userId:', userId);
      await this.setExtractionResult(userId, {
        extractedBirthDate: extractedDate,
        extractedName: extractedName,
        extractedCpf: extractedCpf ?? null,
        extractedDocNumber: extractedDocNumberValue,
        status: KYC_EXTRACTION_STATUS.DIVERGENT,
        fraudSignal: KYC_FRAUD_SIGNAL.NAME_DIVERGENT,
      });
      return;
    }

    // CPF: só exige conferência quando o documento TEM CPF extraído (ex.: CNH ou RG que traz CPF).
    // RG sem CPF: não extraímos CPF → aprovamos por nome + data + RG; RG com CPF divergente → não aprovar.
    const userDocDigits = user.document?.replace(/\D/g, '') ?? '';
    if (extractedCpf && userDocDigits.length === 11 && extractedCpf !== userDocDigits) {
      console.log('[KycExtraction] DIVERGENT (CPF no documento diverge do cadastro). userId:', userId);
      await this.setExtractionResult(userId, {
        extractedBirthDate: extractedDate,
        extractedName: extractedName ?? null,
        extractedCpf: extractedCpf,
        extractedDocNumber: extractedDocNumberValue,
        status: KYC_EXTRACTION_STATUS.DIVERGENT,
        fraudSignal: KYC_FRAUD_SIGNAL.CPF_DIVERGENT,
      });
      return;
    }

    // RG: só comparar quando o documento enviado é RG (carteira de identidade). CNH tem número próprio, não batemos com user.rg.
    if (extractedDoc?.source === 'RG' && user.rg?.trim()) {
      const normalizedExtracted = normalizeRgForCompare(extractedDoc.value);
      const normalizedUser = normalizeRgForCompare(user.rg);
      if (normalizedExtracted !== normalizedUser) {
        console.log('[KycExtraction] DIVERGENT (RG do documento diverge do cadastro). userId:', userId);
        await this.setExtractionResult(userId, {
          extractedBirthDate: extractedDate,
          extractedName: extractedName ?? null,
          extractedCpf: extractedCpf ?? null,
          extractedDocNumber: extractedDocNumberValue,
          status: KYC_EXTRACTION_STATUS.DIVERGENT,
          fraudSignal: KYC_FRAUD_SIGNAL.RG_DIVERGENT,
        });
        return;
      }
    }

    // Só aprovar automaticamente quando tivermos extraído nome (e RG quando aplicável), para exibir o valor do OCR nos cards aprovados.
    if (user.name?.trim() && !extractedName) {
      console.log('[KycExtraction] Dados batem mas nome não foi extraído do doc → NOT_EXTRACTED (revisão manual). userId:', userId);
      await this.setExtractionResult(userId, {
        extractedBirthDate: extractedDate,
        extractedName: null,
        extractedCpf: extractedCpf ?? null,
        extractedDocNumber: extractedDocNumberValue,
        status: KYC_EXTRACTION_STATUS.NOT_EXTRACTED,
      });
      return;
    }
    if (extractedDoc?.source === 'RG' && user.rg?.trim() && !extractedDocNumberValue) {
      console.log('[KycExtraction] Dados batem mas número do RG não foi extraído do doc → NOT_EXTRACTED (revisão manual). userId:', userId);
      await this.setExtractionResult(userId, {
        extractedBirthDate: extractedDate,
        extractedName: extractedName ?? null,
        extractedCpf: extractedCpf ?? null,
        extractedDocNumber: null,
        status: KYC_EXTRACTION_STATUS.NOT_EXTRACTED,
      });
      return;
    }

    console.log(
      '[KycExtraction] Result OK. userId:',
      userId,
      'name:',
      !!extractedName,
      'cpf:',
      !!extractedCpf,
      'doc:',
      extractedDoc?.source ?? '-',
    );
    await this.setExtractionResult(userId, {
      extractedBirthDate: extractedDate,
      extractedName: extractedName ?? null,
      extractedCpf: extractedCpf ?? null,
      extractedDocNumber: extractedDocNumberValue,
      status: KYC_EXTRACTION_STATUS.OK,
    });
    // Aprovação automática: todos os pontos bateram; não exige decisão do admin.
    await this.adminService
      .updateUserKyc(userId, 'VERIFIED', null)
      .then(() => {
        console.log('[KycExtraction] Auto-approved KYC. userId:', userId);
        this.notifyAdminsKycAutoApproved(userId, user.name).catch((e) =>
          console.warn('[KycExtraction] notifyAdminsKycAutoApproved failed', e),
        );
      })
      .catch((e) => console.warn('[KycExtraction] Auto-approve failed (user may no longer be PENDING). userId:', userId, e));
  }

  private async setExtractionResult(
    userId: string,
    payload: {
      extractedBirthDate: Date | null;
      extractedName: string | null;
      extractedCpf: string | null;
      extractedDocNumber: string | null;
      status: string;
      fraudSignal?: KycFraudSignal;
    },
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        kycExtractedBirthDate: payload.extractedBirthDate,
        kycExtractedName: payload.extractedName,
        kycExtractedCpf: payload.extractedCpf,
        kycExtractedDocNumber: payload.extractedDocNumber,
        kycExtractionStatus: payload.status,
        kycExtractionRunAt: new Date(),
        kycFraudSignal: payload.fraudSignal ?? null,
      },
    });
    if (payload.fraudSignal) {
      this.notifyAdminsKycFraud(userId, payload.fraudSignal).catch((e) =>
        console.warn('[KycExtraction] notifyAdminsKycFraud failed', e),
      );
    }
  }

  /** Envia in-app para todos os admins quando um KYC é aprovado automaticamente. */
  private async notifyAdminsKycAutoApproved(userId: string, userName: string): Promise<void> {
    const adminIds = this.config.get<string>('ADMIN_USER_IDS')?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
    if (adminIds.length === 0) return;
    const title = 'KYC aprovado automaticamente';
    const body = `${userName} passou na análise automática. Toque para ver aprovados.`;
    const pushData = { screen: 'adminPendingKyc', tab: 'approved', type: IN_APP_NOTIFICATION_TYPES.KYC_AUTO_APPROVED };
    for (const adminId of adminIds) {
      this.inAppNotifications
        .create(adminId, IN_APP_NOTIFICATION_TYPES.KYC_AUTO_APPROVED, title, body, { userId }, pushData)
        .catch(() => {});
    }
  }

  /** Envia in-app + push para todos os admins quando um KYC é sinalizado como possível fraude. */
  private async notifyAdminsKycFraud(userId: string, fraudSignal: KycFraudSignal): Promise<void> {
    const adminIds = this.config.get<string>('ADMIN_USER_IDS')?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
    if (adminIds.length === 0) return;
    const label = FRAUD_SIGNAL_LABELS[fraudSignal] ?? fraudSignal;
    const title = 'KYC: possível fraude';
    const body = `${label}. Toque para abrir a fila de validação.`;
    const pushData = { screen: 'adminPendingKyc', type: IN_APP_NOTIFICATION_TYPES.KYC_FRAUD_SUSPICIOUS };
    for (const adminId of adminIds) {
      this.inAppNotifications
        .create(adminId, IN_APP_NOTIFICATION_TYPES.KYC_FRAUD_SUSPICIOUS, title, body, { userId }, pushData)
        .catch(() => {});
    }
  }
}
