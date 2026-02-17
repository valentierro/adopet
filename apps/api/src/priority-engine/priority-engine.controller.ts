import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PriorityEngineService } from './priority-engine.service';
import type { PriorityAdopterItem } from './priority-engine.types';

@ApiTags('priority-engine')
@ApiBearerAuth()
@Controller('priority-engine')
@UseGuards(JwtAuthGuard)
export class PriorityEngineController {
  constructor(private readonly priorityEngine: PriorityEngineService) {}

  @Get('pet/:petId/adopters')
  @ApiOperation({
    summary: 'Lista adotantes que favoritaram o pet, ordenados por prioridade (tutor)',
    description:
      'Apenas o tutor (dono do pet) pode chamar. Retorna quem priorizar: match score, perfil completo e se já conversou.',
  })
  async getPriorityAdopters(
    @CurrentUser() user: { id: string },
    @Param('petId') petId: string,
  ): Promise<PriorityAdopterItem[]> {
    return this.priorityEngine.getPriorityAdopters(petId, user.id);
  }
}
