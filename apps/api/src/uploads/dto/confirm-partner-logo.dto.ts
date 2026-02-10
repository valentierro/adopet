import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ConfirmPartnerLogoDto {
  @ApiProperty({ description: 'Key retornada pelo presign do upload da logo' })
  @IsString()
  key: string;
}
