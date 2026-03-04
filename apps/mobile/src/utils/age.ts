/**
 * Verificação de idade para adoção (18+ anos, boas práticas).
 */

const MIN_AGE_TO_ADOPT = 18;

/**
 * Calcula idade em anos completos a partir de birthDate (YYYY-MM-DD).
 */
function getAgeInYears(birthDate: string | null | undefined, referenceDate = new Date()): number | null {
  if (!birthDate || birthDate.length < 10) return null;
  const [y, m, d] = birthDate.slice(0, 10).split('-').map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  const b = new Date(y, m - 1, d);
  const r = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  if (b.getTime() > r.getTime()) return null;
  let years = r.getFullYear() - b.getFullYear();
  if (r.getMonth() < b.getMonth() || (r.getMonth() === b.getMonth() && r.getDate() < b.getDate())) {
    years -= 1;
  }
  return years;
}

export type AdoptionAgeEligibility = {
  eligible: boolean;
  reason?: string;
};

/**
 * Verifica se o usuário pode adotar com base na idade (18+).
 * Usado antes de enviar formulário de adoção ou confirmar adoção.
 */
export function isUserEligibleToAdoptByAge(me: { birthDate?: string | null } | null | undefined): AdoptionAgeEligibility {
  if (!me) return { eligible: false, reason: 'Carregue seu perfil para continuar.' };
  if (me.birthDate == null || me.birthDate === '') {
    return {
      eligible: false,
      reason: 'Para adotar, informe sua data de nascimento em Perfil > Editar perfil.',
    };
  }
  const age = getAgeInYears(me.birthDate);
  if (age === null) {
    return {
      eligible: false,
      reason: 'Data de nascimento inválida. Atualize em Perfil > Editar perfil.',
    };
  }
  if (age < MIN_AGE_TO_ADOPT) {
    return {
      eligible: false,
      reason: 'Para adotar um pet é necessário ter 18 anos ou mais, de acordo com boas práticas de adoção.',
    };
  }
  return { eligible: true };
}

/**
 * Verifica se uma data de nascimento em ISO (YYYY-MM-DD) corresponde a 18 anos ou mais.
 * Usado no cadastro para bloquear criação de conta por menores de 18 anos.
 */
export function isBirthDateStringAtLeast18(birthDateIso: string | null | undefined): boolean {
  if (!birthDateIso || birthDateIso.length < 10) return false;
  const age = getAgeInYears(birthDateIso);
  return age !== null && age >= MIN_AGE_TO_ADOPT;
}
