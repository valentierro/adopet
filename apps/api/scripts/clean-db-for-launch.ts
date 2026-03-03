/**
 * Limpa a base de dados para lançamento em produção.
 * Mantém apenas a(s) conta(s) de admin (ADMIN_USER_IDS).
 * Remove: anúncios (pets), chat (conversas/mensagens), adoções, swipes, favoritos,
 * parceiros, denúncias, bloqueios, notificações, etc.
 *
 * NÃO executa migrations — apenas apaga dados. A conta admin deve já existir
 * no banco (criada manualmente ou por seed anterior).
 *
 * Uso:
 *   cd apps/api
 *   DATABASE_URL="..." ADMIN_USER_IDS="uuid-do-admin" pnpm run db:clean-for-launch
 *
 * Ou com .env carregado:
 *   pnpm run db:clean-for-launch
 */
import { PrismaClient } from '../api/prisma-generated';

const prisma = new PrismaClient();

function getAdminIds(): string[] {
  const raw = process.env.ADMIN_USER_IDS;
  if (!raw?.trim()) {
    throw new Error('Defina ADMIN_USER_IDS no ambiente (ex: ADMIN_USER_IDS="uuid-do-admin")');
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const adminIds = getAdminIds();
  const log = (msg: string) => console.log('[clean-db-for-launch]', msg);

  log('Iniciando limpeza da base para lançamento.');
  log('Admin(s) a manter: ' + adminIds.join(', '));
  console.log('');

  // Ordem: tabelas dependentes primeiro (respeitando FKs)
  const steps: { name: string; fn: () => Promise<{ count: number }> }[] = [
    { name: 'AdoptionFormViewLog', fn: () => prisma.adoptionFormViewLog.deleteMany({}) },
    { name: 'AdoptionFormSubmission', fn: () => prisma.adoptionFormSubmission.deleteMany({}) },
    { name: 'AdoptionRequest', fn: () => prisma.adoptionRequest.deleteMany({}) },
    { name: 'Message', fn: () => prisma.message.deleteMany({}) },
    { name: 'ConversationParticipant', fn: () => prisma.conversationParticipant.deleteMany({}) },
    { name: 'Conversation', fn: () => prisma.conversation.deleteMany({}) },
    { name: 'SatisfactionSurvey', fn: () => prisma.satisfactionSurvey.deleteMany({}) },
    { name: 'Adoption', fn: () => prisma.adoption.deleteMany({}) },
    { name: 'PetView', fn: () => prisma.petView.deleteMany({}) },
    { name: 'Swipe', fn: () => prisma.swipe.deleteMany({}) },
    { name: 'Favorite', fn: () => prisma.favorite.deleteMany({}) },
    { name: 'PetMedia', fn: () => prisma.petMedia.deleteMany({}) },
    { name: 'PetPartnership', fn: () => prisma.petPartnership.deleteMany({}) },
    { name: 'Pet', fn: () => prisma.pet.deleteMany({}) },
    { name: 'Report', fn: () => prisma.report.deleteMany({}) },
    { name: 'Block', fn: () => prisma.block.deleteMany({}) },
    { name: 'Verification', fn: () => prisma.verification.deleteMany({}) },
    { name: 'BugReport', fn: () => prisma.bugReport.deleteMany({}) },
    { name: 'SavedSearch', fn: () => prisma.savedSearch.deleteMany({}) },
    { name: 'RefreshToken', fn: () => prisma.refreshToken.deleteMany({}) },
    { name: 'InAppNotification', fn: () => prisma.inAppNotification.deleteMany({}) },
    { name: 'PartnerRecommendation', fn: () => prisma.partnerRecommendation.deleteMany({}) },
    { name: 'PartnerMember', fn: () => prisma.partnerMember.deleteMany({}) },
    { name: 'AdoptionFormQuestion', fn: () => prisma.adoptionFormQuestion.deleteMany({}) },
    { name: 'AdoptionFormTemplate', fn: () => prisma.adoptionFormTemplate.deleteMany({}) },
    { name: 'PartnerEvent', fn: () => prisma.partnerEvent.deleteMany({}) },
    { name: 'PartnerService', fn: () => prisma.partnerService.deleteMany({}) },
    { name: 'PartnerCoupon', fn: () => prisma.partnerCoupon.deleteMany({}) },
    { name: 'Partner', fn: () => prisma.partner.deleteMany({}) },
    { name: 'PartnershipRequest', fn: () => prisma.partnershipRequest.deleteMany({}) },
    { name: 'UserPreferences', fn: () => prisma.userPreferences.deleteMany({}) },
  ];

  let totalRemoved = 0;
  for (const { name, fn } of steps) {
    const result = await fn();
    const count = result.count;
    totalRemoved += count;
    console.log(`  [OK] ${name}: ${count} registro(s) removido(s)`);
  }

  // Remove todos os usuários que NÃO são admin
  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { notIn: adminIds } },
  });
  totalRemoved += deletedUsers.count;
  console.log(`  [OK] User (não admin): ${deletedUsers.count} removido(s)`);
  console.log('');

  const keptUsers = await prisma.user.count({ where: { id: { in: adminIds } } });

  // Verificação pós-limpeza: garantir que tabelas críticas estão vazias
  const [petCount, conversationCount, messageCount] = await Promise.all([
    prisma.pet.count(),
    prisma.conversation.count(),
    prisma.message.count(),
  ]);

  const checksOk = petCount === 0 && conversationCount === 0 && messageCount === 0;
  if (!checksOk) {
    log('AVISO: Verificação pós-limpeza falhou!');
    console.log(`  Pet: ${petCount} (esperado 0)`);
    console.log(`  Conversation: ${conversationCount} (esperado 0)`);
    console.log(`  Message: ${messageCount} (esperado 0)`);
  } else {
    log('Verificação pós-limpeza: Pet=0, Conversation=0, Message=0 — OK.');
  }

  // Resumo final
  console.log('');
  console.log('========== RESUMO ==========');
  console.log(`  Total de registros removidos: ${totalRemoved}`);
  console.log(`  Usuários removidos (não admin): ${deletedUsers.count}`);
  console.log(`  Usuários mantidos (admin): ${keptUsers}`);
  console.log(`  IDs admin mantidos: ${adminIds.join(', ')}`);
  console.log(`  Tabelas de dados limpas: ${steps.length}`);
  console.log('  FeatureFlag: mantida (configuração de produção).');
  if (checksOk && keptUsers > 0) {
    console.log('  Status: Tudo certo. Base pronta para lançamento.');
  } else if (keptUsers === 0) {
    console.log('  Status: Atenção — nenhum admin encontrado no banco. Verifique ADMIN_USER_IDS.');
  } else {
    console.log('  Status: Atenção — revise os avisos acima.');
  }
  console.log('===========================');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error('[clean-db-for-launch] Erro:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
