import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ example: 'maria.silva', description: 'Nome de usuário único (@nome) para ser encontrado ao indicar adotante' })
  username?: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiProperty()
  createdAt: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  bio?: string;

  @ApiPropertyOptional({ enum: ['CASA', 'APARTAMENTO'] })
  housingType?: string;

  @ApiPropertyOptional()
  hasYard?: boolean;

  @ApiPropertyOptional()
  hasOtherPets?: boolean;

  @ApiPropertyOptional()
  hasChildren?: boolean;

  @ApiPropertyOptional({ enum: ['MOST_DAY', 'HALF_DAY', 'LITTLE'] })
  timeAtHome?: string;

  @ApiPropertyOptional({ description: 'Indica se o usuário possui verificação aprovada' })
  verified?: boolean;

  @ApiPropertyOptional({ description: 'Indica se o usuário é administrador (pode acessar painel admin)' })
  isAdmin?: boolean;

  @ApiPropertyOptional({ description: 'Dados do parceiro vinculado (se for parceiro comercial cadastrado pelo app)' })
  partner?: {
    id: string;
    name: string;
    slug: string;
    subscriptionStatus?: string;
    planId?: string;
    isPaidPartner: boolean;
  };
}
