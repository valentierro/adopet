import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import type { PrismaClient as PrismaClientType } from '../../api/prisma-generated';

// Em runtime o código está em dist/src/prisma/ (3 níveis); em Jest está em src/prisma/ (2 níveis)
const path = require('path');
const isFromDist = __dirname.includes(path.sep + 'dist' + path.sep);
const prismaGeneratedPath = path.join(__dirname, '..', '..', ...(isFromDist ? ['..'] : []), 'api', 'prisma-generated');
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
