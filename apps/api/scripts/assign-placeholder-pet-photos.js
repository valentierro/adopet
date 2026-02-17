"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_generated_1 = require("../api/prisma-generated");
const prisma = new prisma_generated_1.PrismaClient();
function placeholderPhotoUrl(species) {
    const size = 400 + Math.floor(Math.random() * 5);
    if (species === 'DOG')
        return `https://placedog.net/${size}/${size}?id=${Date.now()}`;
    return `https://placekitten.com/${size}/${size}?id=${Date.now()}`;
}
async function main() {
    const petsWithoutPhoto = await prisma.pet.findMany({
        where: { media: { none: {} } },
        select: { id: true, name: true, species: true },
    });
    if (petsWithoutPhoto.length === 0) {
        console.log('Nenhum pet sem foto encontrado.');
        return;
    }
    console.log(`Encontrados ${petsWithoutPhoto.length} pet(s) sem foto. Atribuindo imagem aleatória...`);
    for (const pet of petsWithoutPhoto) {
        const url = placeholderPhotoUrl(pet.species);
        await prisma.petMedia.create({
            data: {
                petId: pet.id,
                url,
                sortOrder: 0,
                isPrimary: true,
            },
        });
        console.log(`  ${pet.name} (${pet.species}) → ${url}`);
    }
    console.log(`Pronto. ${petsWithoutPhoto.length} pet(s) atualizado(s).`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=assign-placeholder-pet-photos.js.map