"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_generated_1 = require("../api/prisma-generated");
const prisma = new prisma_generated_1.PrismaClient();
function getAdminIds() {
    const raw = process.env.ADMIN_USER_IDS;
    if (!raw?.trim()) {
        throw new Error('Defina ADMIN_USER_IDS no ambiente (ex: ADMIN_USER_IDS="uuid-1,uuid-2")');
    }
    return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}
async function main() {
    const adminIds = getAdminIds();
    console.log('Mantendo apenas os usuários admin:', adminIds);
    await prisma.message.deleteMany({});
    await prisma.conversationParticipant.deleteMany({});
    await prisma.conversation.deleteMany({});
    await prisma.swipe.deleteMany({});
    await prisma.favorite.deleteMany({});
    await prisma.adoption.deleteMany({});
    await prisma.petMedia.deleteMany({});
    await prisma.pet.deleteMany({});
    await prisma.report.deleteMany({});
    await prisma.block.deleteMany({});
    await prisma.verification.deleteMany({});
    await prisma.bugReport.deleteMany({});
    await prisma.savedSearch.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.userPreferences.deleteMany({});
    await prisma.partnerCoupon.deleteMany({});
    await prisma.partnerService.deleteMany({});
    await prisma.partnerEvent.deleteMany({});
    await prisma.partner.deleteMany({});
    const deleted = await prisma.user.deleteMany({
        where: { id: { notIn: adminIds } },
    });
    console.log('Usuários removidos:', deleted.count);
    const kept = await prisma.user.count({ where: { id: { in: adminIds } } });
    console.log('Usuários mantidos (admin):', kept);
    if (kept === 0) {
        console.warn('Atenção: nenhum usuário com ID em ADMIN_USER_IDS foi encontrado. Verifique se o ID está correto no banco.');
    }
}
main()
    .then(() => {
    console.log('Concluído.');
    process.exit(0);
})
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=reset-db-keep-admin.js.map