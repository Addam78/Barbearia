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

  // Remetente: MAIL_FROM (ex.: "Barbearia <contato@exemplo.com>"). Sem ele, cai no SMTP_USER,
  // que só serve como endereço quando o login SMTP é um e-mail (ex.: Mailtrap em desenvolvimento).
  private get from() {
    return this.config.get<string>('MAIL_FROM') ?? this.config.get<string>('SMTP_USER');
  }

  async sendInviteEmail(to: string, name: string, token: string) {
    const frontendUrl = (this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173').replace(/\/+$/, '');
    const link = `${frontendUrl}/aceitar-convite?token=${encodeURIComponent(token)}`;

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Bem-vindo à Barbearia — defina sua senha',
      html: `<p>Olá, ${name}!</p><p>Clique no link para definir sua senha: <a href="${link}">${link}</a></p>`,
    });
  }

  async sendRegistrationConfirmationEmail(to: string, name: string) {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Cadastro confirmado — Barbearia',
      html: `<p>Olá, ${name}!</p><p>Seu cadastro foi concluído com sucesso. Agora você já pode fazer login na plataforma.</p>`,
    })
  }
}