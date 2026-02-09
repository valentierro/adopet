import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class ReorderMediaDto {
  @ApiProperty({ type: [String], description: 'IDs das mídias na nova ordem' })
  @IsArray()
  @IsUUID('4', { each: true })
  mediaIds: string[];
}
