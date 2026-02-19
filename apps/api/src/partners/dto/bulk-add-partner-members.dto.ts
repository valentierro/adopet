import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { PARTNER_MEMBER_ROLES } from './add-partner-member.dto';

const MAX_BULK_MEMBERS = 25;

export class BulkAddPartnerMemberItemDto {
  @ApiProperty({ example: 'membro@ong.org', description: 'E-mail válido para o membro receber o convite de senha' })
  @IsEmail({}, { message: 'Informe um e-mail válido para o membro receber o convite.' })
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

  @ApiPropertyOptional({ enum: PARTNER_MEMBER_ROLES, description: 'Função na ONG' })
  @IsOptional()
  @IsString()
  @IsIn(PARTNER_MEMBER_ROLES, { message: 'Função inválida. Use uma das opções: VOLUNTARIO, COORDENADOR, CUIDADOR, RECEPCIONISTA, VETERINARIO, ADMINISTRATIVO, OUTRO.' })
  role?: string;
}

export class BulkAddPartnerMembersDto {
  @ApiProperty({
    type: [BulkAddPartnerMemberItemDto],
    description: `Lista de membros a adicionar (máximo ${MAX_BULK_MEMBERS} por vez).`,
    maxItems: MAX_BULK_MEMBERS,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Envie ao menos um membro.' })
  @ArrayMaxSize(MAX_BULK_MEMBERS, { message: `Máximo de ${MAX_BULK_MEMBERS} membros por importação.` })
  @ValidateNested({ each: true })
  @Type(() => BulkAddPartnerMemberItemDto)
  members: BulkAddPartnerMemberItemDto[];
}

export { MAX_BULK_MEMBERS };
