import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsBoolean } from 'class-validator';

export class ConfirmUploadDto {
  @ApiProperty({ description: 'ID do pet ao qual associar a mídia' })
  @IsUUID()
  petId: string;

  @ApiProperty({ description: 'Key retornada pelo presign' })
  @IsString()
  key: string;

  @ApiProperty({ required: false, description: 'Se é a foto principal' })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
