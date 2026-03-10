/**
 * Redefine a senha de um usuário pelo ID (útil para admin criado manualmente no Neon).
 * A senha no banco é armazenada em hash; não é possível "recuperar", só definir uma nova.
 *
 * Uso:
 *   cd apps/api
 *   DATABASE_URL="postgresql://..." \
 *   USER_ID="98fc0e5c-f3d1-4b89-99df-2c197d4302b2" \
 *   NEW_PASSWORD="sua-senha-nova" \
 *   pnpm run db:reset-user-password
 */
import { PrismaClient } from '../api/prisma-generated';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const prisma = new PrismaClient();

function env(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) {
    throw new Error(`Defina ${name} no ambiente.`);
  }
  return v.trim();
}

async function main() {
  const userId = env('USER_ID');
  const newPassword = env('NEW_PASSWORD');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) {
    console.error('[reset-user-password] Usuário não encontrado com id:', userId);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  console.log('[reset-user-password] Senha atualizada para:', user.email ?? user.name ?? user.id);
  console.log('  Login:', user.email, '/ (a senha que você definiu em NEW_PASSWORD)');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
