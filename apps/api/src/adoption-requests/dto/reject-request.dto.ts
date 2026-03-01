import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class RejectRequestDto {
  @ApiPropertyOptional({ description: 'Feedback opcional para o interessado' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;
}
