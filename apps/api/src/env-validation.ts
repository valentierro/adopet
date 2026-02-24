/**
 * Valida variáveis de ambiente obrigatórias na subida da API.
 * Falha cedo com mensagem clara em vez de quebrar no primeiro request.
 */
function getEnv(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export function validateRequiredEnv(): void {
  const missing: string[] = [];

  if (!getEnv('DATABASE_URL')) missing.push('DATABASE_URL');
  if (!getEnv('JWT_SECRET')) missing.push('JWT_SECRET');

  if (missing.length > 0) {
    throw new Error(
      `Variáveis de ambiente obrigatórias não definidas: ${missing.join(', ')}. ` +
        'Configure-as no .env ou no painel da Vercel (produção).',
    );
  }
}
