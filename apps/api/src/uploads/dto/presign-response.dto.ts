import { ApiProperty } from '@nestjs/swagger';

export class PresignResponseDto {
  @ApiProperty({ description: 'URL para PUT do arquivo (presigned)' })
  uploadUrl: string;

  @ApiProperty({ description: 'Key do objeto no bucket (usar em confirm)' })
  key: string;

  @ApiProperty({ description: 'URL pública do arquivo após upload' })
  publicUrl: string;
}
