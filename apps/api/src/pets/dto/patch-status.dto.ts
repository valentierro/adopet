import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class PatchStatusDto {
  @ApiProperty({ enum: ['AVAILABLE', 'IN_PROCESS', 'ADOPTED'] })
  @IsIn(['AVAILABLE', 'IN_PROCESS', 'ADOPTED'])
  status: 'AVAILABLE' | 'IN_PROCESS' | 'ADOPTED';
}
