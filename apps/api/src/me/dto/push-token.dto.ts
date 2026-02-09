import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class PushTokenDto {
  @ApiProperty({ description: 'Expo push token (ExponentPushToken[...]). Envie null para remover.' })
  @IsOptional()
  @IsString()
  pushToken?: string | null;
}
