import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AdoptionFormsService } from './adoption-forms.service';
import { CreateFormTemplateDto } from './dto/create-form-template.dto';
import { UpdateFormTemplateDto } from './dto/update-form-template.dto';
import type { AdoptionFormTemplateWithQuestions } from './adoption-forms.service';

@ApiTags('adoption-forms')
@ApiBearerAuth()
@Controller('partners/me/adoption-forms')
@UseGuards(JwtAuthGuard)
export class AdoptionFormsController {
  constructor(private readonly adoptionFormsService: AdoptionFormsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar templates de formulário de adoção (parceiro)' })
  async list(@CurrentUser() user: { id: string }): Promise<AdoptionFormTemplateWithQuestions[]> {
    return this.adoptionFormsService.listTemplates(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar template com perguntas (parceiro)' })
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateFormTemplateDto,
  ): Promise<AdoptionFormTemplateWithQuestions> {
    return this.adoptionFormsService.create(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter um template com perguntas (parceiro)' })
  async getOne(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ): Promise<AdoptionFormTemplateWithQuestions> {
    return this.adoptionFormsService.getOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar template (cria nova versão, parceiro)' })
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateFormTemplateDto,
  ): Promise<AdoptionFormTemplateWithQuestions> {
    return this.adoptionFormsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desativar template (parceiro)' })
  async deactivate(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.adoptionFormsService.deactivate(user.id, id);
  }
}
