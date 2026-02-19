/**
 * Remove da base os favoritos em que o tutor favoritou o próprio anúncio.
 * Esses registros deixam de ser exibidos/contados pela API; este script só limpa a base.
 *
 * Uso (a partir de apps/api):
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/delete-own-pet-favorites.ts
 */
import { PrismaClient } from '../api/prisma-generated';

const prisma = new PrismaClient();

async function main() {
  const favorites = await prisma.favorite.findMany({
    include: { pet: { select: { ownerId: true } } },
  });
  const toDelete = favorites.filter((f) => f.userId === f.pet.ownerId);
  if (toDelete.length === 0) {
    console.log('Nenhum favorito "próprio anúncio" encontrado.');
    return;
  }
  const ids = toDelete.map((f) => f.id);
  await prisma.favorite.deleteMany({ where: { id: { in: ids } } });
  console.log(`Removidos ${ids.length} favorito(s) em que o tutor havia favoritado o próprio anúncio.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
