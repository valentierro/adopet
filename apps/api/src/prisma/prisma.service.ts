import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import type { PrismaClient as PrismaClientType } from '../../api/prisma-generated';
import * as path from 'path';
import * as fs from 'fs';

// Em dist: __dirname = dist/src/prisma -> dist/api/prisma-generated
// Na Vercel (código em src/): __dirname = src/prisma -> src/prisma-generated (cópia no build)
function resolvePrismaGenerated(): string {
  const relApi = path.join(__dirname, '..', '..', 'api', 'prisma-generated');
  const relSrc = path.join(__dirname, '..', 'prisma-generated');
  if (fs.existsSync(relApi)) return relApi;
  if (fs.existsSync(relSrc)) return relSrc;
  return relApi;
}
const prismaGeneratedPath = resolvePrismaGenerated();
const PrismaClientConstructor = require(prismaGeneratedPath).PrismaClient as typeof PrismaClientType;

@Injectable()
export class PrismaService extends PrismaClientConstructor implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
