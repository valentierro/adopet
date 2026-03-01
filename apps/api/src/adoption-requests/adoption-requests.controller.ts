import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AdoptionRequestsService } from './adoption-requests.service';
import { SendFormDto } from './dto/send-form.dto';
import { SubmitFormDto } from './dto/submit-form.dto';
import { RejectRequestDto } from './dto/reject-request.dto';
import type { AdoptionRequestWithDetails } from './adoption-requests.service';

@ApiTags('adoption-requests')
@ApiBearerAuth()
@Controller('adoption-requests')
@UseGuards(JwtAuthGuard)
export class AdoptionRequestsController {
  constructor(private readonly adoptionRequestsService: AdoptionRequestsService) {}

  @Post('send-form')
  @ApiOperation({ summary: 'Enviar formulário de adoção ao interessado (parceiro)' })
  async sendForm(
    @CurrentUser() user: { id: string },
    @Body() dto: SendFormDto,
  ): Promise<AdoptionRequestWithDetails> {
    return this.adoptionRequestsService.sendForm(user.id, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Enviar formulário preenchido (adotante)' })
  async submitForm(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: SubmitFormDto,
  ): Promise<AdoptionRequestWithDetails> {
    return this.adoptionRequestsService.submitForm(user.id, id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar solicitações (parceiro, opcional por pet)' })
  async list(
    @CurrentUser() user: { id: string },
    @Query('petId') petId?: string,
  ): Promise<AdoptionRequestWithDetails[]> {
    return this.adoptionRequestsService.listForPartner(user.id, { petId });
  }

  @Get('my-requests')
  @ApiOperation({ summary: 'Listar minhas solicitações de adoção (adotante)' })
  async listMyRequests(
    @CurrentUser() user: { id: string },
  ): Promise<AdoptionRequestWithDetails[]> {
    return this.adoptionRequestsService.listMyRequests(user.id);
  }

  @Get(':id/submission/pdf')
  @ApiOperation({ summary: 'Baixar PDF do formulário preenchido (parceiro)' })
  async getSubmissionPdf(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ): Promise<StreamableFile> {
    const buffer = await this.adoptionRequestsService.getSubmissionPdf(user.id, id);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: 'attachment; filename="formulario-adocao.pdf"',
    });
  }

  @Get(':id/form')
  @ApiOperation({ summary: 'Obter template do formulário para preenchimento (adotante)' })
  async getForm(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ): Promise<{
    requestId: string;
    expiresAt?: string | null;
    template: {
      id: string;
      name: string;
      questions: Array<{
        id: string;
        type: string;
        label: string;
        required: boolean;
        placeholder?: string;
        options?: unknown;
      }>;
    };
  }> {
    return this.adoptionRequestsService.getFormForRequest(user.id, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter uma solicitação com submission (parceiro ou adotante)' })
  async getOne(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ): Promise<AdoptionRequestWithDetails> {
    return this.adoptionRequestsService.getOne(user.id, id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Aprovar solicitação (parceiro)' })
  async approve(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ): Promise<AdoptionRequestWithDetails> {
    return this.adoptionRequestsService.approve(user.id, id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Rejeitar solicitação com feedback opcional (parceiro)' })
  async reject(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto?: RejectRequestDto,
  ): Promise<AdoptionRequestWithDetails> {
    return this.adoptionRequestsService.reject(user.id, id, dto);
  }
}
