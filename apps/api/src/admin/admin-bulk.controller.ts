import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { readFile } from 'fs/promises';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AdminBulkService, type BulkResult } from './admin-bulk.service';

/** Multer file (buffer when memoryStorage, path when diskStorage) */
interface MulterFile {
  buffer?: Buffer;
  path?: string;
}

async function getFileBuffer(file: MulterFile): Promise<Buffer> {
  if (file.buffer) return file.buffer;
  if (file.path) return readFile(file.path);
  throw new BadRequestException('Arquivo inválido.');
}

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/bulk')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminBulkController {
  constructor(private readonly adminBulkService: AdminBulkService) {}

  @Post('partners')
  @ApiOperation({ summary: '[Admin] Importar parceiros em massa via CSV' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file'))
  async uploadPartners(@UploadedFile() file: MulterFile): Promise<BulkResult> {
    if (!file) throw new BadRequestException('Envie um arquivo CSV.');
    const buffer = await getFileBuffer(file);
    return this.adminBulkService.bulkCreatePartners(buffer);
  }

  @Post('partner-members')
  @ApiOperation({ summary: '[Admin] Importar membros de ONG em massa via CSV' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file'))
  async uploadPartnerMembers(@UploadedFile() file: MulterFile): Promise<BulkResult> {
    if (!file) throw new BadRequestException('Envie um arquivo CSV.');
    const buffer = await getFileBuffer(file);
    return this.adminBulkService.bulkCreatePartnerMembers(buffer);
  }

  @Post('pets')
  @ApiOperation({ summary: '[Admin] Importar anúncios (pets) em massa via CSV' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file'))
  async uploadPets(@UploadedFile() file: MulterFile): Promise<BulkResult> {
    if (!file) throw new BadRequestException('Envie um arquivo CSV.');
    const buffer = await getFileBuffer(file);
    return this.adminBulkService.bulkCreatePets(buffer);
  }
}
