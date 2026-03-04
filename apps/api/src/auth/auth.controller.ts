import { Controller, Post, Get, Body, Query, Res, HttpCode, HttpStatus, UseGuards, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { randomBytes } from 'crypto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { PartnerSignupDto } from './dto/partner-signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { SignupResponseDto } from './dto/signup-response.dto';
import { PresignSignupKycDto } from './dto/presign-signup-kyc.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('check-email')
  @ApiOperation({ summary: 'Verificar se o e-mail está disponível para cadastro (não existe na base)' })
  async checkEmail(@Query('email') email: string): Promise<{ available: boolean }> {
    if (typeof email !== 'string' || !email.trim()) {
      throw new BadRequestException('Informe o e-mail.');
    }
    return this.authService.checkEmailAvailable(email);
  }

  @Get('check-document')
  @ApiOperation({ summary: 'Verificar se o CPF/CNPJ está disponível para cadastro (não existe na base)' })
  async checkDocument(@Query('document') document: string): Promise<{ available: boolean }> {
    if (typeof document !== 'string' || !document.trim()) {
      throw new BadRequestException('Informe o documento (CPF ou CNPJ).');
    }
    return this.authService.checkDocumentAvailable(document);
  }

  @Post('presign-signup-kyc')
  @ApiOperation({ summary: 'Obter URL para upload de documento KYC antes do signup (sem autenticação). Envie a key no signup como selfieWithDocKey.' })
  async presignSignupKyc(@Body() dto: PresignSignupKycDto): Promise<{ uploadUrl: string; key: string }> {
    return this.authService.presignSignupKyc(dto.filename, dto.contentType);
  }

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
    const appUrl = this.config.get<string>('APP_URL')?.replace(/\/$/, '') ?? 'https://appadopet.com.br';
    const logoUrl = (this.config.get<string>('LOGO_URL') || appUrl + '/logo.png').trim();
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${isSuccess ? 'E-mail confirmado' : 'Link inválido'} - Adopet</title></head>
<body style="margin:0;padding:0;background:#E5EDEA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;">
  <div style="max-width:400px;width:100%;background:#fff;border:2px solid #D97706;border-radius:16px;padding:32px 24px;text-align:center;margin:24px;">
    <div style="text-align:center;margin-bottom:20px;">
      <img src="${logoUrl}" alt="Adopet" width="160" height="56" style="max-height:56px;width:auto;object-fit:contain;" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />
      <span style="font-size:28px;font-weight:700;color:#D97706;display:none;">Adopet</span>
    </div>
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
    const appUrl = this.config.get<string>('APP_URL')?.replace(/\/$/, '') ?? 'https://appadopet.com.br';
    const logoUrl = (this.config.get<string>('LOGO_URL') || appUrl + '/logo.png').trim();
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${isSuccess ? 'Senha enviada' : 'Link inválido'} - Adopet</title></head>
<body style="margin:0;padding:0;background:#E5EDEA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;">
  <div style="max-width:400px;width:100%;background:#fff;border:2px solid #D97706;border-radius:16px;padding:32px 24px;text-align:center;margin:24px;">
    <div style="text-align:center;margin-bottom:20px;">
      <img src="${logoUrl}" alt="Adopet" width="160" height="56" style="max-height:56px;width:auto;object-fit:contain;" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />
      <span style="font-size:28px;font-weight:700;color:#D97706;display:none;">Adopet</span>
    </div>
    <p style="font-size:15px;color:#57534E;line-height:1.6;margin:0;">${result.message}</p>
  </div>
</body>
</html>`;
    (res as any).set('Content-Type', 'text/html').send(html);
  }

  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Definir senha com token do e-mail (conta criada por aprovação de parceria ou convite membro ONG)' })
  async setPassword(@Body() dto: SetPasswordDto): Promise<{ message: string }> {
    return this.authService.setPassword(dto.token, dto.newPassword, dto.newPasswordConfirm);
  }

  @Get('set-password')
  @ApiOperation({ summary: 'Página do link do e-mail: formulário para definir senha' })
  async setPasswordPage(@Query('token') token: string | string[], @Res() res: Response): Promise<void> {
    const tokenStr = Array.isArray(token) ? (token[0] ?? '') : (typeof token === 'string' ? token : '');
    const tokenEscaped = tokenStr.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const appUrl = this.config.get<string>('APP_URL')?.replace(/\/$/, '') ?? 'https://appadopet.com.br';
    const logoUrl = (this.config.get<string>('LOGO_URL') || appUrl + '/logo.png').trim();

    const ctx = await this.authService.getSetPasswordPageContext(tokenStr);
    const isMember = ctx?.isPartnerMemberOnly ?? false;
    const pageTitle = isMember ? 'Você foi adicionado(a) à equipe da ONG' : (ctx?.isPartnerAdmin ? 'Você é o administrador da ONG no Adopet' : 'Definir senha');
    const introParagraph = isMember
      ? 'O administrador da ONG adicionou você como membro da equipe no Adopet. Defina uma senha abaixo para acessar o app e ajudar na gestão dos pets e adoções.'
      : ctx?.isPartnerAdmin
        ? 'No portal do parceiro você pode cadastrar cupons, serviços e <strong>membros da equipe</strong>. Você é responsável pelos usuários vinculados à sua ONG — contamos com você para manter um ambiente controlado, seguro e respeitoso.'
        : 'Defina uma senha abaixo para acessar o app.';
    const loginHint = isMember
      ? 'Use o <strong>e-mail</strong> em que você recebeu o convite e a <strong>senha</strong> que você definir abaixo. Abra o app Adopet, toque em Entrar e informe esses dados.'
      : 'Use o <strong>e-mail</strong> em que você recebeu a confirmação de parceria e a <strong>senha</strong> que você definir abaixo. Abra o app Adopet, toque em Entrar e informe esses dados.';

    const nonce = randomBytes(16).toString('base64');
    const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}'; script-src-attr 'nonce-${nonce}'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; frame-ancestors 'self'`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Definir senha - Adopet</title>
</head>
<body style="margin:0;padding:0;background:#E5EDEA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;">
  <div style="max-width:440px;width:100%;background:#fff;border:2px solid #0D9488;border-radius:16px;padding:28px 24px;margin:24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <img id="logoImg" src="${logoUrl}" alt="Adopet" width="160" height="56" style="max-height:56px;width:auto;object-fit:contain;" />
      <span id="logoFallback" style="font-size:28px;font-weight:700;color:#0D9488;display:none;">Adopet</span>
    </div>
    <p style="font-size:16px;font-weight:600;color:#1C1917;margin:0 0 12px 0;">${pageTitle}</p>
    <p style="font-size:14px;color:#57534E;line-height:1.65;margin:0 0 8px 0;">${introParagraph}</p>
    <p style="font-size:14px;color:#57534E;line-height:1.6;margin:0 0 20px 0;">Defina uma senha abaixo (mínimo 6 caracteres, com letra e número). Use o mesmo e-mail que recebeu esta confirmação e esta senha para fazer login no app.</p>
    <div id="formWrap">
      <div id="errorBox" style="display:none;margin-bottom:16px;padding:12px;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;color:#B91C1C;font-size:14px;"></div>
      <form id="setPasswordForm" style="text-align:left;">
        <input type="hidden" name="token" value="${tokenEscaped}" />
        <label style="display:block;font-size:14px;color:#57534E;margin-bottom:4px;">Nova senha</label>
        <div style="position:relative;margin-bottom:12px;">
          <input type="password" name="newPassword" id="newPassword" required minlength="6" placeholder="Mín. 6 caracteres, letra e número" style="width:100%;padding:12px 52px 12px 12px;border:1px solid #ccc;border-radius:8px;font-size:16px;box-sizing:border-box;" />
          <button type="button" id="eye1" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;min-width:44px;min-height:44px;padding:0;color:#57534E;font-size:20px;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;touch-action:manipulation;" title="Mostrar senha" aria-label="Mostrar senha"><span aria-hidden="true">&#128065;</span></button>
        </div>
        <label style="display:block;font-size:14px;color:#57534E;margin-bottom:4px;">Repetir a senha</label>
        <div style="position:relative;margin-bottom:20px;">
          <input type="password" name="newPasswordConfirm" id="newPasswordConfirm" required minlength="6" placeholder="Digite a mesma senha" style="width:100%;padding:12px 52px 12px 12px;border:1px solid #ccc;border-radius:8px;font-size:16px;box-sizing:border-box;" />
          <button type="button" id="eye2" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;min-width:44px;min-height:44px;padding:0;color:#57534E;font-size:20px;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;touch-action:manipulation;" title="Mostrar senha" aria-label="Mostrar senha"><span aria-hidden="true">&#128065;</span></button>
        </div>
        <button type="submit" id="submitBtn" style="width:100%;padding:14px;background:linear-gradient(135deg,#0D9488,#14B8A6);color:#fff;border:0;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;">Definir senha</button>
      </form>
      <div style="margin-top:20px;padding:12px;background:#F0FDFA;border-radius:8px;border:1px solid #99F6E4;">
        <p style="font-size:13px;color:#0F766E;margin:0 0 6px 0;font-weight:600;">Como fazer login no app</p>
        <p style="font-size:13px;color:#0F766E;line-height:1.5;margin:0;">${loginHint}</p>
      </div>
    </div>
    <div id="successWrap" style="display:none;text-align:center;padding:24px 0;background:#F0FDFA;border:2px solid #0D9488;border-radius:12px;margin-top:20px;" role="alert" aria-live="polite">
      <div style="width:80px;height:80px;margin:0 auto 24px;background:#0D9488;border-radius:50%;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:48px;color:#fff;line-height:1;">✓</span>
      </div>
      <p style="font-size:20px;font-weight:700;color:#0D9488;margin:0 0 16px 0;">Senha definida com sucesso!</p>
      <p style="font-size:15px;color:#57534E;line-height:1.6;margin:0;">Faça login no app com o e-mail em que você recebeu a confirmação e a senha que acabou de definir.</p>
    </div>
  </div>
  <script nonce="${nonce}">
    (function() {
      var formAction = window.location.href.split('?')[0];
      var logoImg = document.getElementById('logoImg');
      var logoFallback = document.getElementById('logoFallback');
      if (logoImg && logoFallback) {
        logoImg.addEventListener('error', function() { logoImg.style.display = 'none'; logoFallback.style.display = 'block'; });
      }
      document.getElementById('eye1').addEventListener('click', function() {
        var el = document.getElementById('newPassword');
        var btn = document.getElementById('eye1');
        if (!el || !btn) return;
        if (el.type === 'password') {
          el.type = 'text';
          btn.querySelector('span').innerHTML = '&#128584;';
          btn.title = 'Ocultar senha';
          btn.setAttribute('aria-label', 'Ocultar senha');
        } else {
          el.type = 'password';
          btn.querySelector('span').innerHTML = '&#128065;';
          btn.title = 'Mostrar senha';
          btn.setAttribute('aria-label', 'Mostrar senha');
        }
      });
      document.getElementById('eye2').addEventListener('click', function() {
        var el = document.getElementById('newPasswordConfirm');
        var btn = document.getElementById('eye2');
        if (!el || !btn) return;
        if (el.type === 'password') {
          el.type = 'text';
          btn.querySelector('span').innerHTML = '&#128584;';
          btn.title = 'Ocultar senha';
          btn.setAttribute('aria-label', 'Ocultar senha');
        } else {
          el.type = 'password';
          btn.querySelector('span').innerHTML = '&#128065;';
          btn.title = 'Mostrar senha';
          btn.setAttribute('aria-label', 'Mostrar senha');
        }
      });
      document.getElementById('setPasswordForm').addEventListener('submit', function(e) {
        e.preventDefault();
        var p1 = document.getElementById('newPassword').value;
        var p2 = document.getElementById('newPasswordConfirm').value;
        var errBox = document.getElementById('errorBox');
        errBox.style.display = 'none';
        errBox.textContent = '';
        if (!p2) { errBox.textContent = 'Repita a senha no segundo campo.'; errBox.style.display = 'block'; return; }
        if (p1 !== p2) { errBox.textContent = 'As senhas não coincidem. Digite a mesma senha nos dois campos.'; errBox.style.display = 'block'; return; }
        var btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.textContent = 'Salvando...';
        var form = document.getElementById('setPasswordForm');
        var body = new URLSearchParams(new FormData(form));
        fetch(formAction, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
          .then(function(r) {
            return r.text().then(function(t) {
              try { var d = JSON.parse(t); return { ok: r.ok, data: d }; }
              catch (_) { return { ok: r.ok, data: { message: t || 'Erro inesperado' } }; }
            });
          })
          .then(function(o) {
            if (o.ok) {
              var formWrapEl = document.getElementById('formWrap');
              var successWrapEl = document.getElementById('successWrap');
              if (formWrapEl) formWrapEl.style.display = 'none';
              if (successWrapEl) {
                successWrapEl.style.display = 'block';
                successWrapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            } else {
              errBox.textContent = o.data && o.data.message ? o.data.message : 'Não foi possível definir a senha. Tente novamente.';
              errBox.style.display = 'block';
              btn.disabled = false;
              btn.textContent = 'Definir senha';
            }
          })
          .catch(function(err) {
            errBox.textContent = 'Erro de conexão. Verifique sua internet e tente novamente.';
            errBox.style.display = 'block';
            btn.disabled = false;
            btn.textContent = 'Definir senha';
          });
      });
    })();
  </script>
</body>
</html>`;
    res.set('Content-Type', 'text/html').set('Content-Security-Policy', csp).send(html);
  }
}
