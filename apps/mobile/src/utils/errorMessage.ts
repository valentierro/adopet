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
  if (/HMRClient\.registerBundle|registerBundle is not a function/i.test(msg)) {
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
