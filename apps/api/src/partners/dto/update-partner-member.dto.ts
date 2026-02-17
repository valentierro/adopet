import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';
import { PARTNER_MEMBER_ROLES, type PartnerMemberRole } from './add-partner-member.dto';

export class UpdatePartnerMemberDto {
  @ApiPropertyOptional({
    enum: [...PARTNER_MEMBER_ROLES, ''],
    description: 'Função na ONG (vazio para remover)',
  })
  @IsOptional()
  @IsString()
  @IsIn([...PARTNER_MEMBER_ROLES, ''], { message: 'Função inválida.' })
  role?: PartnerMemberRole | '';
}
