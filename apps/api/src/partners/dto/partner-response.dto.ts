import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Resposta pública (lista no app, dropdown ao criar pet) */
export class PartnerPublicDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'ONG' })
  type: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  city?: string | null;

  @ApiPropertyOptional({ description: 'Endereço completo para abrir no mapa' })
  address?: string | null;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  website?: string | null;

  @ApiPropertyOptional()
  logoUrl?: string | null;

  @ApiPropertyOptional()
  phone?: string | null;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional({ description: 'Parceria paga: destaque e boost no feed' })
  isPaidPartner?: boolean;
}

/** Resposta para admin (lista completa, com approvedAt etc.) */
export class PartnerAdminDto extends PartnerPublicDto {
  @ApiProperty()
  active: boolean;

  @ApiPropertyOptional()
  approvedAt?: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

/** Resposta para o dono do parceiro (portal do parceiro): dados completos + assinatura */
export class PartnerMeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  website?: string;

  @ApiPropertyOptional()
  logoUrl?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional({ type: [String], description: 'URLs das fotos da galeria' })
  galleryUrls?: string[];

  @ApiProperty()
  active: boolean;

  @ApiPropertyOptional()
  approvedAt?: string;

  @ApiProperty()
  isPaidPartner: boolean;

  @ApiPropertyOptional({ description: 'Status da assinatura Stripe: active | canceled | past_due | trialing' })
  subscriptionStatus?: string;

  @ApiPropertyOptional({ description: 'Plano atual: BASIC | DESTAQUE | PREMIUM' })
  planId?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
