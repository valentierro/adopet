import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ConfirmAvatarDto {
  @ApiProperty({ description: 'Key retornada pelo presign do avatar' })
  @IsString()
  key: string;
}
