import { Injectable, Logger } from '@nestjs/common';
import { MessageHandlerErrorBehavior, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from './mail.service.js';

@Injectable()
export class NotificationsConsumer {
  private readonly logger = new Logger(NotificationsConsumer.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  @RabbitSubscribe({
    exchange: 'barbearia.events',
    routingKey: 'user.created',
    queue: 'email.user-created',
    queueOptions: {
      arguments: {
        'x-dead-letter-exchange': 'barbearia.events.dlx',
        'x-dead-letter-routing-key': 'user.created',
      },
    },
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleUserCreated(payload: { id: string; name: string; email: string; role: string; needsInvite: boolean }) {
    this.logger.log(`Processando user.created: ${payload.email}`);

    if (!payload.needsInvite) {
      return;
    }

    const token = randomUUID();

    await this.prisma.inviteToken.create({
      data: {
        token,
        userId: payload.id,
      },
    });

    await this.mailService.sendInviteEmail(payload.email, payload.name, token);
  }
}