import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailService } from './mail.service.js';

vi.mock('nodemailer');

describe('MailService', () => {
  const sendMail = vi.fn();

  function createService(env: Record<string, string | undefined>) {
    vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as any);
    const config = { get: (key: string) => env[key] } as unknown as ConfigService;
    return new MailService(config);
  }

  beforeEach(() => {
    sendMail.mockReset().mockResolvedValue(undefined);
  });

  describe('sendInviteEmail', () => {
    it('monta o link do convite na tela do frontend, usando FRONTEND_URL', async () => {
      const service = createService({ FRONTEND_URL: 'https://barbearia.exemplo.com', SMTP_USER: 'no-reply@exemplo.com' });

      await service.sendInviteEmail('carlos@barbearia.com', 'Carlos', 'abc-123');

      const { html, to } = sendMail.mock.calls[0][0];
      expect(to).toBe('carlos@barbearia.com');
      expect(html).toContain('https://barbearia.exemplo.com/aceitar-convite?token=abc-123');
      expect(html).not.toContain('localhost:3000');
      expect(html).not.toContain('/auth/accept-invite');
    });

    it('ignora a barra final da FRONTEND_URL', async () => {
      const service = createService({ FRONTEND_URL: 'https://barbearia.exemplo.com/' });

      await service.sendInviteEmail('carlos@barbearia.com', 'Carlos', 'abc-123');

      const { html } = sendMail.mock.calls[0][0];
      expect(html).toContain('https://barbearia.exemplo.com/aceitar-convite?token=abc-123');
      expect(html).not.toContain('.com//aceitar-convite');
    });

    it('sem FRONTEND_URL, usa o mesmo padrão do CORS (localhost:5173)', async () => {
      const service = createService({});

      await service.sendInviteEmail('carlos@barbearia.com', 'Carlos', 'abc-123');

      expect(sendMail.mock.calls[0][0].html).toContain('http://localhost:5173/aceitar-convite?token=abc-123');
    });

    it('codifica o token na URL', async () => {
      const service = createService({ FRONTEND_URL: 'https://barbearia.exemplo.com' });

      await service.sendInviteEmail('carlos@barbearia.com', 'Carlos', 'a b&c');

      expect(sendMail.mock.calls[0][0].html).toContain('?token=a%20b%26c');
    });
  });
});
