import { Controller, Post, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { ReportResponseDto } from './dto/report-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar denúncia (pet, usuário ou mensagem)' })
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateReportDto,
  ): Promise<ReportResponseDto> {
    return this.reportsService.create(user.id, dto);
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '[Admin] Listar todas as denúncias' })
  async findAll(): Promise<ReportResponseDto[]> {
    return this.reportsService.findAll();
  }

  @Put(':id/resolve')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '[Admin] Marcar denúncia como resolvida (feedback opcional; opção de banir usuário alvo)' })
  async resolve(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: ResolveReportDto,
  ): Promise<ReportResponseDto> {
    return this.reportsService.resolve(id, user.id, dto?.resolutionFeedback, dto?.banReportedUser);
  }
}
