/**
 * Helpers para erros de cadastro (signup).
 * A API retorna 409 Conflict quando email, nome de usuário ou telefone já está em uso.
 */

/**
 * Retorna true se o erro for 409 Conflict do signup (email/username/telefone já cadastrado).
 * Usado para não logar no console em __DEV__ erros esperados como "Email já cadastrado".
 */
export function isSignup409Conflict(errorOrMessage: unknown): boolean {
  const msg = errorOrMessage instanceof Error ? errorOrMessage.message : String(errorOrMessage);
  if (/^API\s+409\b/i.test(msg)) return true;
  if (/409|Conflict/i.test(msg) && /já (está )?cadastrado|já em uso|already (in )?use/i.test(msg)) return true;
  return false;
}
