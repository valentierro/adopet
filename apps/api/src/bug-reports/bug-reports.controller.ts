import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { BugReportsService } from './bug-reports.service';
import { CreateBugReportDto } from './dto/create-bug-report.dto';

@ApiTags('bug-reports')
@Controller('bug-reports')
export class BugReportsController {
  constructor(private readonly bugReportsService: BugReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Reportar bug/erro (app em beta). Auth opcional.' })
  @ApiBearerAuth()
  @UseGuards(OptionalJwtAuthGuard)
  async create(
    @Body() dto: CreateBugReportDto,
    @CurrentUser() user?: { id: string },
  ): Promise<{ id: string }> {
    return this.bugReportsService.create(dto, user?.id);
  }
}
