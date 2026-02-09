import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class CreateBlockDto {
  @ApiProperty({ description: 'ID do usuário a ser bloqueado' })
  @IsString()
  @IsUUID()
  blockedUserId: string;
}
