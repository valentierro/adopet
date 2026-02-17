"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_generated_1 = require("../api/prisma-generated");
const prisma = new prisma_generated_1.PrismaClient();
function isBrokenSeedPhotoUrl(url) {
    return (url.includes('localhost') ||
        url.includes('127.0.0.1') ||
        url.includes('/v1/seed-photos/'));
}
function externalPhotoUrl(species, index) {
    const size = 400 + (index % 5);
    if (species === 'DOG')
        return `https://placedog.net/${size}/${size}?id=${index}`;
    return `https://placekitten.com/${size}/${size}?id=${index}`;
}
async function main() {
    const allMedia = await prisma.petMedia.findMany({
        include: { pet: { select: { species: true } } },
    });
    const toFix = allMedia.filter((m) => isBrokenSeedPhotoUrl(m.url));
    if (toFix.length === 0) {
        console.log('Nenhuma URL de foto quebrada (localhost/seed-photos) encontrada.');
        return;
    }
    console.log(`Encontradas ${toFix.length} foto(s) com URL quebrada. Corrigindo...`);
    for (let i = 0; i < toFix.length; i++) {
        const m = toFix[i];
        const newUrl = externalPhotoUrl(m.pet.species, i);
        await prisma.petMedia.update({
            where: { id: m.id },
            data: { url: newUrl },
        });
        console.log(`  ${m.id} (${m.pet.species}) → ${newUrl}`);
    }
    console.log(`Pronto. ${toFix.length} URL(s) atualizada(s).`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=fix-seed-photo-urls.js.map