import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn, IsUUID } from 'class-validator';

export class CreateSwipeDto {
  @ApiProperty({ description: 'ID do pet' })
  @IsString()
  @IsUUID()
  petId: string;

  @ApiProperty({ description: 'Ação', enum: ['LIKE', 'PASS'] })
  @IsIn(['LIKE', 'PASS'])
  action: 'LIKE' | 'PASS';
}
