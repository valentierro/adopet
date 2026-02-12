import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT') ?? 465,
        secure: true,
        auth: { user, pass },
      });
    }
  }

  /** Retorna true se o envio está configurado. */
  isConfigured(): boolean {
    return this.transporter != null;
  }

  /**
   * Envia um e-mail. Se SMTP não estiver configurado, não faz nada (útil em dev).
   */
  async sendMail(options: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<void> {
    if (!this.transporter) {
      return;
    }
    const from = this.config.get<string>('EMAIL_FROM') ?? this.config.get<string>('SMTP_USER') ?? 'noreply@appadopet.com.br';
    await this.transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html ?? options.text.replace(/\n/g, '<br>\n'),
    });
  }
}
