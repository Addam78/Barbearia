import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: this.config.get<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendInviteEmail(to: string, name: string, token: string) {
    const frontendUrl = (this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173').replace(/\/+$/, '');
    const link = `${frontendUrl}/aceitar-convite?token=${encodeURIComponent(token)}`;

    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_USER'),
      to,
      subject: 'Bem-vindo à Barbearia — defina sua senha',
      html: `<p>Olá, ${name}!</p><p>Clique no link para definir sua senha: <a href="${link}">${link}</a></p>`,
    });
  }

  async sendRegistrationConfirmationEmail(to: string, name: string) {
    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_USER'),
      to,
      subject: 'Cadastro confirmado — Barbearia',
      html: `<p>Olá, ${name}!</p><p>Seu cadastro foi concluído com sucesso. Agora você já pode fazer login na plataforma.</p>`,
    })
  }
}