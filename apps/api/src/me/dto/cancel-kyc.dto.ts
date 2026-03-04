import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsIn } from 'class-validator';

/** Opções de motivo de cancelamento da solicitação KYC (exibidas no app). */
export const KYC_CANCELLATION_REASONS = [
  'WRONG_DOCUMENT',
  'WANT_TO_RESUBMIT',
  'NOT_ADOPTING_NOW',
  'OTHER',
] as const;

export type KycCancellationReasonCode = (typeof KYC_CANCELLATION_REASONS)[number];

const REASON_LABELS: Record<KycCancellationReasonCode, string> = {
  WRONG_DOCUMENT: 'Enviei documento errado',
  WANT_TO_RESUBMIT: 'Quero enviar novamente',
  NOT_ADOPTING_NOW: 'Desisti de adotar no momento',
  OTHER: 'Outro',
};

export function getKycCancellationReasonLabel(code: string): string {
  return REASON_LABELS[code as KycCancellationReasonCode] ?? code;
}

export class CancelKycDto {
  @ApiProperty({
    description: 'Motivo do cancelamento (código).',
    enum: KYC_CANCELLATION_REASONS,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @IsIn(KYC_CANCELLATION_REASONS)
  cancellationReason: string;
}
