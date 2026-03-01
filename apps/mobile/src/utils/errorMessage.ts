/**
 * Verifica se o erro é 403 com code KYC_REQUIRED (API exige verificação de identidade para confirmar adoção).
 */
export function isKycRequiredError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const match = msg.match(/^API\s+403\s*:\s*(.+)/s);
  if (!match) return false;
  try {
    const body = JSON.parse(match[1].trim());
    return body?.code === 'KYC_REQUIRED';
  } catch {
    return false;
  }
}

/** Erro quando o tutor tenta marcar como adotante alguém que ainda não completou KYC (400). */
export function isKycNotCompleteError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const match = msg.match(/^API\s+400\s*:\s*(.+)/s);
  if (!match) return false;
  try {
    const body = JSON.parse(match[1].trim());
    return body?.code === 'KYC_NOT_COMPLETE';
  } catch {
    return false;
  }
}

/** Mensagem do corpo do erro (ex.: message de KYC_NOT_COMPLETE). */
export function getApiErrorBodyMessage(error: unknown): string | null {
  const msg = error instanceof Error ? error.message : String(error);
  const match = msg.match(/^API\s+\d{3}\s*:\s*(.+)/s);
  if (!match) return null;
  try {
    const body = JSON.parse(match[1].trim());
    return typeof body?.message === 'string' ? body.message : null;
  } catch {
    return null;
  }
}

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
    const status = msg.match(/^API\s+(\d{3})/i)?.[1];
    const isHtmlBody = body.length > 100 && (/<\s*!?DOCTYPE|<\s*html\b|<\s*script\b/i.test(body) || (body.includes('<') && body.includes('>')));
    if (status && isHtmlBody) {
      return status === '404'
        ? 'A URL da API pode estar errada (rota não encontrada). Em desenvolvimento no celular, use o IP do seu computador em EXPO_PUBLIC_API_URL (ex: http://192.168.1.10:3000).'
        : 'O servidor respondeu com erro. Tente novamente ou faça login (a conta pode ter sido criada).';
    }
    try {
      const parsed = JSON.parse(body);
      const m = parsed?.message ?? parsed?.error;
      const strMsg = Array.isArray(m) && m.length > 0 && typeof m[0] === 'string' ? m[0] : typeof m === 'string' ? m : '';
      if (strMsg && strMsg.length < 120) return getFriendlyErrorMessage(new Error(strMsg), fallback);
    } catch {
      // body não é JSON, seguir com a msg inteira para os regex abaixo
    }
  }

  // Validação 400: mensagens do class-validator (evitar confundir com "credenciais inválidas")
  if (/must be an email|email must be|invalid email|e-mail inválido/i.test(msg)) {
    return 'Informe um e-mail válido (ex: seu@email.com).';
  }
  if (/password must be|senha deve|min.*caracteres|at least one letter|uma letra e um número/i.test(msg)) {
    return 'A senha deve ter no mínimo 6 caracteres, com pelo menos uma letra e um número.';
  }

  // Alterar senha: senha atual incorreta (não confundir com login)
  if (/senha atual incorreta|current password.*incorrect/i.test(msg)) {
    return 'Senha atual incorreta. Tente novamente.';
  }
  // Login bloqueado: e-mail não confirmado (verificar antes da mensagem genérica de login)
  if (/confirme seu e-mail|confirm.*email|email.*não confirmado/i.test(msg)) {
    return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada e clique no link que enviamos.';
  }
  // Sessão expirada (token JWT ou refresh): não confundir com login com senha errada
  if (/jwt expired|token expired|refresh token inválido|refresh token.*expirado|sessão expirada|^unauthorized$/i.test(msg)) {
    return 'Sua sessão expirou. Faça login novamente.';
  }
  if (/^API\s+401/i.test(msg)) {
    const body = msg.replace(/^API\s+401\s*:\s*/i, '').trim();
    try {
      const parsed = JSON.parse(body);
      const m = (parsed?.message ?? parsed?.error ?? '');
      const strMsg = typeof m === 'string' ? m : Array.isArray(m) && m[0] ? String(m[0]) : '';
      if (/jwt expired|unauthorized/i.test(strMsg) && !/email ou senha inválidos|senha inválidos/i.test(strMsg)) {
        return 'Sua sessão expirou. Faça login novamente.';
      }
    } catch {
      // não é JSON
    }
  }
  // E-mail inválido ou não encontrado (login)
  if (/invalid.*email|email.*invalid|user not found|usuário não encontrado/i.test(msg) && /login|auth|credencial/i.test(msg)) {
    return 'E-mail inválido ou não cadastrado. Tente novamente.';
  }
  // Senha incorreta ou credenciais inválidas (login)
  if (/unauthorized|não autorizado|credenciais|invalid.*password|invalid.*credentials|wrong password|senha inválida|email ou senha inválidos|email ou senha incorretos|401/i.test(msg)) {
    return 'E-mail ou senha incorretos. Tente novamente.';
  }
  if (/conflict|já existe|already exists|cadastrado/i.test(msg)) {
    if (/nome de usuário|username.*em uso|em uso.*username/i.test(msg)) {
      return 'Este nome de usuário já está em uso. Escolha outro.';
    }
    if (/telefone.*cadastrado|cadastrado.*telefone|phone.*already/i.test(msg)) {
      return 'Este telefone já está em uso. Tente fazer login ou use outro número.';
    }
    if (/documento.*cadastrado|cadastrado.*documento|CPF.*cadastrado|cadastrado.*CPF|CNPJ.*cadastrado|cadastrado.*CNPJ/i.test(msg)) {
      return 'Este CPF ou CNPJ já está cadastrado. Tente fazer login ou use outro documento.';
    }
    if (/(CPF|CNPJ).*conta|conta.*documento|documento.*já possui|já possui.*documento/i.test(msg)) {
      return 'Este CPF ou CNPJ já possui uma conta. Use outro documento ou faça login.';
    }
    return 'Este email já está em uso. Tente fazer login ou use outro email.';
  }
  if (/pendingAdopterId.*UUID|UUID.*pendingAdopterId|ID do adotante.*inválido/i.test(msg)) {
    return 'O ID do adotante não é válido. Selecione novamente na lista, busque por @usuário ou use "Outra pessoa".';
  }
  if (/conversado com você sobre este pet|conversado.*app|adotante.*conversado/i.test(msg)) {
    return 'Só é possível indicar como adotante alguém que tenha conversado com você sobre este pet no app.';
  }
  if (/adotante não pode ser o próprio tutor|adotante.*tutor/i.test(msg)) {
    return 'O adotante não pode ser o próprio tutor.';
  }
  if (/Usuário @.*não encontrado|não encontrado.*nome de usuário/i.test(msg)) {
    return msg.length < 120 ? msg : 'Usuário não encontrado. Peça para a pessoa criar conta e definir um nome de usuário no perfil.';
  }
  if (/CPF ou CNPJ inválido|invalid.*CPF|invalid.*CNPJ|verifique os dígitos/i.test(msg)) {
    return 'CPF ou CNPJ inválido. Verifique os dígitos.';
  }
  if (/bad request|informe.*nome de usuário|nome de usuário.*mínimo|use apenas letras/i.test(msg)) {
    return 'Nome de usuário inválido. Use 2 a 30 caracteres: letras minúsculas, números, ponto ou underscore.';
  }
  if (/forbidden|não permitido|não participa|favoritou|403/i.test(msg)) {
    return 'Adicione o pet aos favoritos para iniciar a conversa.';
  }
  if (/not found|não encontrado|404/i.test(msg)) {
    // 404 em login/cadastro costuma ser rota inexistente (URL da API errada); em outros casos é recurso não encontrado
    return 'Serviço temporariamente indisponível. Tente novamente em instantes.';
  }
  // Só tratar como erro de Metro/bundler se NÃO for resposta da API (evitar confundir 404/500 com HTML que contenha "registerBundle")
  const isApiError = /^API\s+\d{3}\s*:/i.test(msg);
  if (!isApiError && /HMRClient\.registerBundle|registerBundle is not a function/i.test(msg)) {
    return 'Erro do ambiente de desenvolvimento. Pare o servidor (Ctrl+C). Na raiz do projeto (pasta adopet) execute: pnpm dev:mobile:clear. Ou, dentro de apps/mobile, execute: pnpm dev:clear. Depois abra o app de novo.';
  }
  if (/request timeout|timeout|timed out|abort|the operation was aborted/i.test(msg) && !/connection|network|fetch/i.test(msg)) {
    return 'A requisição demorou demais. Tente novamente.';
  }
  if (/network|fetch|connection|ECONNREFUSED|failed to fetch|could not connect/i.test(msg)) {
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

  // Se for mensagem curta e não parecer técnica, pode ser amigável (ex.: erros do backend em português)
  if (typeof msg === 'string' && msg.length < 160 && !/^API\s|status|code\s|error\s*:|\d{3}/i.test(msg) && !/stack|at\s+\S+|\.ts:|\.js:/i.test(msg)) {
    return msg;
  }

  return fallback;
}
