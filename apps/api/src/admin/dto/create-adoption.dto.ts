import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAdoptionDto {
  @ApiProperty({ description: 'ID do pet adotado' })
  @IsUUID()
  petId!: string;

  @ApiPropertyOptional({ description: 'ID do usuário que adotou (adotante); se omitido, usa o adotante indicado pelo tutor (pendingAdopterId)' })
  @IsOptional()
  @IsUUID()
  adopterUserId?: string;
}
