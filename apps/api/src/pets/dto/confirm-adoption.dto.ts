import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class ConfirmAdoptionDto {
  @ApiPropertyOptional({
    description: 'Adotante declara que leu e aceitou o termo de responsabilidade da adoção.',
  })
  @IsOptional()
  @IsBoolean()
  responsibilityTermAccepted?: boolean;
}
