import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'usuario@email.com' })
  @IsString()
  @IsEmail()
  email: string;
}
