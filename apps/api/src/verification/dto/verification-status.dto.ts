import { ApiProperty } from '@nestjs/swagger';

export class VerificationItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['USER_VERIFIED', 'PET_VERIFIED'] })
  type: string;

  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  status: string;

  @ApiProperty({ required: false, description: 'Para PET_VERIFIED: id do pet' })
  petId?: string;

  @ApiProperty({ required: false, description: 'Nome do usuário (listApproved)' })
  userName?: string;

  @ApiProperty({ required: false, description: 'Nome do pet (listApproved, PET_VERIFIED)' })
  petName?: string;

  @ApiProperty({ required: false, description: '[Admin] ID do usuário que solicitou' })
  userId?: string;
  @ApiProperty({ required: false, description: '[Admin] Avatar do usuário' })
  userAvatarUrl?: string;
  @ApiProperty({ required: false, description: '[Admin] Cidade do usuário' })
  userCity?: string;
  @ApiProperty({ required: false, description: '[Admin] @username do usuário' })
  userUsername?: string;

  /** [Admin listPending] Perfil do usuário já aprovado (selo Verificado) */
  userVerified?: boolean;
  /** [Admin listPending] Nível do tutor (ex: BEGINNER, GOLD) */
  userTutorLevel?: string;
  /** [Admin listPending] Título do nível (ex: Tutor Ouro) */
  userTutorTitle?: string;

  /** [Admin listPending PET_VERIFIED] Dados do pet para card */
  @ApiProperty({ required: false })
  petSpecies?: string;
  @ApiProperty({ required: false })
  petAge?: number;
  @ApiProperty({ required: false })
  petSex?: string;
  @ApiProperty({ required: false })
  petVaccinated?: boolean;
  @ApiProperty({ required: false })
  petNeutered?: boolean;
  @ApiProperty({ required: false, description: 'URL da primeira foto do pet' })
  petPhotoUrl?: string;
  @ApiProperty({ required: false, description: 'Nome do tutor do pet' })
  petOwnerName?: string;

  @ApiProperty({ required: false, description: 'Motivo da rejeição (quando status === REJECTED)' })
  rejectionReason?: string;

  @ApiProperty({ required: false, description: 'URLs das fotos anexadas na solicitação (rosto; tutor com pet)', type: [String] })
  evidenceUrls?: string[];

  @ApiProperty({ required: false, description: 'Motivo informado pelo usuário para não enviar fotos (análise apenas por dados)' })
  skipEvidenceReason?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class VerificationStatusDto {
  @ApiProperty({ type: [VerificationItemDto] })
  requests: VerificationItemDto[];

  @ApiProperty({ description: 'Usuário possui verificação aprovada' })
  userVerified: boolean;
}
