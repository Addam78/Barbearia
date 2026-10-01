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
    const link = `http://localhost:3000/auth/accept-invite?token=${token}`;

    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_USER'),
      to,
      subject: 'Bem-vindo à Barbearia — defina sua senha',
      html: `<p>Olá, ${name}!</p><p>Clique no link para definir sua senha: <a href="${link}">${link}</a></p>`,
    });
  }
}