import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsIn, IsOptional, IsUUID, IsArray, IsUrl, MaxLength } from 'class-validator';

export class RequestVerificationDto {
  @ApiProperty({ enum: ['USER_VERIFIED', 'PET_VERIFIED'] })
  @IsString()
  @IsIn(['USER_VERIFIED', 'PET_VERIFIED'])
  type: 'USER_VERIFIED' | 'PET_VERIFIED';

  @ApiPropertyOptional({ description: 'Obrigatório quando type é PET_VERIFIED' })
  @IsOptional()
  @IsUUID()
  petId?: string;

  @ApiPropertyOptional({
    description: 'URLs das fotos de evidência (rosto sem óculos escuros; para pet: + foto com o pet). Obrigatório exceto se skipEvidenceReason for informado.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  evidenceUrls?: string[];

  @ApiPropertyOptional({
    description: 'Se o usuário não puder enviar fotos (ex.: acessibilidade), informar motivo; a análise será feita apenas com os dados do perfil/anúncio.',
    maxLength: 300,
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  skipEvidenceReason?: string;
}
