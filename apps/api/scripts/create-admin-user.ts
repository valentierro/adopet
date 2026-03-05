/**
 * Cria um usuário admin na base apontada por DATABASE_URL.
 * Usado para criar o primeiro admin em produção (senha nunca fica no código).
 *
 * Uso:
 *   cd apps/api
 *   DATABASE_URL="<url-prod>" \
 *   ADMIN_CREATE_EMAIL="contato@appadopet.com.br" \
 *   ADMIN_CREATE_USERNAME="admin.adopet" \
 *   ADMIN_CREATE_PASSWORD="sua-senha-segura" \
 *   pnpm run db:create-admin-user
 *
 * Depois, adicione o UUID impresso em ADMIN_USER_IDS no ambiente de produção (Vercel).
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
  const email = env('ADMIN_CREATE_EMAIL');
  const username = env('ADMIN_CREATE_USERNAME');
  const password = env('ADMIN_CREATE_PASSWORD');

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { id: true, email: true, username: true },
  });
  if (existing) {
    console.error('[create-admin-user] Usuário já existe:', existing);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const name = 'Admin Adopet';

  const user = await prisma.user.create({
    data: {
      email,
      username,
      name,
      passwordHash,
    },
    select: { id: true, email: true, username: true },
  });

  console.log('[create-admin-user] Usuário criado:', user.email, user.username);
  console.log('');
  console.log('Adicione o ID abaixo em ADMIN_USER_IDS no ambiente de produção (Vercel):');
  console.log(user.id);
  console.log('');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
