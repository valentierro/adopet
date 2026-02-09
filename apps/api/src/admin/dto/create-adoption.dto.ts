import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class CreateAdoptionDto {
  @ApiProperty({ description: 'ID do pet adotado' })
  @IsUUID()
  petId!: string;

  @ApiProperty({ description: 'ID do usuário que adotou (adotante)' })
  @IsUUID()
  adopterUserId!: string;
}
