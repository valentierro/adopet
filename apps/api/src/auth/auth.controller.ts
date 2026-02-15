import { Controller, Post, Get, Body, Query, Res, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { PartnerSignupDto } from './dto/partner-signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { SignupResponseDto } from './dto/signup-response.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Cadastrar novo usuário. Com REQUIRE_EMAIL_VERIFICATION=true, exige confirmação de e-mail antes do login.' })
  async signup(@Body() dto: SignupDto): Promise<AuthResponseDto | SignupResponseDto> {
    const result = await this.authService.signup(dto);
    if ('accessToken' in result) return result;
    return { message: result.message, requiresEmailVerification: true };
  }

  @Post('partner-signup')
  @ApiOperation({ summary: 'Cadastro parceiro comercial: cria conta + estabelecimento. Com REQUIRE_EMAIL_VERIFICATION=true, exige confirmação de e-mail.' })
  async partnerSignup(@Body() dto: PartnerSignupDto): Promise<AuthResponseDto | SignupResponseDto> {
    return this.authService.partnerSignup(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login com email e senha' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token usando refresh token' })
  async refresh(@Body() dto: RefreshDto): Promise<AuthResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidar refresh token (logout)' })
  async logout(@Body() dto: RefreshDto): Promise<{ message: string }> {
    return this.authService.logout(dto.refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar link de confirmação por e-mail; ao clicar, envia senha temporária' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Alterar senha (usuário logado)' })
  async changePassword(
    @CurrentUser() user: { id: string },
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(user.id, dto);
  }

  @Get('confirm-email')
  @ApiOperation({ summary: 'Confirmar e-mail do cadastro (link enviado por e-mail)' })
  async confirmEmailPage(@Query('token') token: string, @Res() res: Response): Promise<void> {
    const result = await this.authService.confirmEmail(typeof token === 'string' ? token : '');
    const isSuccess = result.success;
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${isSuccess ? 'E-mail confirmado' : 'Link inválido'} - Adopet</title></head>
<body style="margin:0;padding:0;background:#E5EDEA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;">
  <div style="max-width:400px;width:100%;background:#fff;border:2px solid #D97706;border-radius:16px;padding:32px 24px;text-align:center;margin:24px;">
    <p style="font-size:22px;font-weight:700;color:#1C1917;margin:0 0 8px 0;">Adopet</p>
    <p style="font-size:15px;color:#57534E;line-height:1.6;margin:0;">${result.message}</p>
  </div>
</body>
</html>`;
    (res as any).set('Content-Type', 'text/html').send(html);
  }

  @Get('confirm-reset-password')
  @ApiOperation({ summary: 'Página do link do e-mail: valida token, envia senha temporária e exibe resultado' })
  async confirmResetPasswordPage(@Query('token') token: string | string[], @Res() res: Response): Promise<void> {
    const tokenStr = Array.isArray(token) ? (token[0] ?? '') : (typeof token === 'string' ? token : '');
    const result = await this.authService.confirmResetPassword(tokenStr);
    const isSuccess = result.success;
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${isSuccess ? 'Senha enviada' : 'Link inválido'} - Adopet</title></head>
<body style="margin:0;padding:0;background:#E5EDEA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;">
  <div style="max-width:400px;width:100%;background:#fff;border:2px solid #D97706;border-radius:16px;padding:32px 24px;text-align:center;margin:24px;">
    <p style="font-size:22px;font-weight:700;color:#1C1917;margin:0 0 8px 0;">Adopet</p>
    <p style="font-size:15px;color:#57534E;line-height:1.6;margin:0;">${result.message}</p>
  </div>
</body>
</html>`;
    (res as any).set('Content-Type', 'text/html').send(html);
  }
}
