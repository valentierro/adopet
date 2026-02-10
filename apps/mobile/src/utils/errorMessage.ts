/**
 * Converte erros de API/rede em mensagens amigáveis para o usuário.
 * Evita expor códigos de status, stack traces ou detalhes técnicos.
 */
export function getFriendlyErrorMessage(error: unknown, fallback: string): string {
  if (error == null) return fallback;
  const msg = error instanceof Error ? error.message : String(error);

  // Erro no formato "API 401: body" ou "API 500: ..." — nunca mostrar cru
  if (/^API\s+\d{3}/i.test(msg)) {
    const body = msg.replace(/^API\s+\d{3}\s*:\s*/i, '').trim();
    try {
      const parsed = JSON.parse(body);
      const m = parsed?.message ?? parsed?.error;
      if (typeof m === 'string' && m.length < 100) return getFriendlyErrorMessage(new Error(m), fallback);
      if (Array.isArray(m) && m.length > 0 && typeof m[0] === 'string' && m[0].length < 120) return getFriendlyErrorMessage(new Error(m[0]), fallback);
    } catch {
      // body não é JSON, seguir com a msg inteira para os regex abaixo
    }
  }

  // Mensagens conhecidas do backend (podem vir em pt ou en)
  if (/unauthorized|não autorizado|credenciais|invalid.*password|senha inválida|401/i.test(msg)) {
    return 'Email ou senha incorretos. Tente novamente.';
  }
  if (/conflict|já existe|already exists|cadastrado/i.test(msg)) {
    if (/nome de usuário|username.*em uso|em uso.*username/i.test(msg)) {
      return 'Este nome de usuário já está em uso. Escolha outro.';
    }
    if (/telefone.*cadastrado|cadastrado.*telefone|phone.*already/i.test(msg)) {
      return 'Este telefone já está em uso. Tente fazer login ou use outro número.';
    }
    return 'Este email já está em uso. Tente fazer login ou use outro email.';
  }
  if (/bad request|informe.*nome de usuário|nome de usuário.*mínimo|use apenas letras/i.test(msg)) {
    return 'Nome de usuário inválido. Use 2 a 30 caracteres: letras minúsculas, números, ponto ou underscore.';
  }
  if (/forbidden|não permitido|não participa|favoritou|403/i.test(msg)) {
    return 'Adicione o pet aos favoritos para iniciar a conversa.';
  }
  if (/not found|não encontrado|404/i.test(msg)) {
    return 'Não encontramos o que você buscou. Tente novamente.';
  }
  if (/HMRClient\.registerBundle|registerBundle is not a function/i.test(msg)) {
    return 'Erro do ambiente de desenvolvimento. Pare o servidor (Ctrl+C), na raiz do projeto execute: pnpm dev:mobile:clear — depois abra o app de novo.';
  }
  if (/network|fetch|connection|timeout|ECONNREFUSED|failed to fetch|could not connect/i.test(msg)) {
    return 'Sem conexão. Verifique sua internet e tente de novo.';
  }
  if (/upload.*não configurado|credentials|S3_ACCESS|Could not load credentials/i.test(msg)) {
    return 'Envio de fotos temporariamente indisponível. Se você é o responsável pelo app, configure o armazenamento de arquivos no servidor.';
  }
  if (/pagamentos?\s*não\s*configurados?|payments?\s*not\s*configured/i.test(msg)) {
    return 'Pagamentos não configurados. Entre em contato com o suporte.';
  }
  if (/pushToken|column.*does not exist|API\s*5\d{2}|ECONNREFUSED/i.test(msg)) {
    return 'Ocorreu um erro. Tente novamente em instantes.';
  }

  // Se for mensagem curta e não parecer técnica, pode ser amigável
  if (typeof msg === 'string' && msg.length < 80 && !/^API\s|status|code\s|error\s*:|\d{3}/i.test(msg)) {
    return msg;
  }

  return fallback;
}
