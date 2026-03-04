import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, Matches, MaxLength } from 'class-validator';

export class PresignSignupKycDto {
  @ApiProperty({ description: 'Nome do arquivo (ex: selfie-with-doc-123.jpg)' })
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
