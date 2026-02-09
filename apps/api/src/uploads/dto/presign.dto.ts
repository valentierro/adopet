import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, Matches, MaxLength } from 'class-validator';

export class PresignDto {
  @ApiProperty({ description: 'Nome do arquivo (ex: foto.jpg)' })
  @IsString()
  @MaxLength(200)
  @Matches(/^[\w.-]+\.(jpg|jpeg|png|webp|gif)$/i, {
    message: 'Use extensão jpg, png, webp ou gif.',
  })
  filename: string;

  @ApiProperty({ required: false, description: 'Content-Type (ex: image/jpeg)' })
  @IsOptional()
  @IsString()
  contentType?: string;
}
