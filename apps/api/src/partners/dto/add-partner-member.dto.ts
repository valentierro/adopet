import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength, MaxLength, IsOptional, IsIn } from 'class-validator';

export const PARTNER_MEMBER_ROLES = [
  'VOLUNTARIO',
  'COORDENADOR',
  'CUIDADOR',
  'RECEPCIONISTA',
  'VETERINARIO',
  'ADMINISTRATIVO',
  'OUTRO',
] as const;
export type PartnerMemberRole = (typeof PARTNER_MEMBER_ROLES)[number];

export class AddPartnerMemberDto {
  @ApiProperty({ example: 'membro@ong.org' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres.' })
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: '11999999999' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    enum: PARTNER_MEMBER_ROLES,
    description: 'Função na ONG',
  })
  @IsOptional()
  @IsString()
  @IsIn(PARTNER_MEMBER_ROLES, { message: 'Função inválida.' })
  role?: PartnerMemberRole;
}
