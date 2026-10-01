import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

@Injectable()
export class NotificationsService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  publishUserCreated(payload: { id: string; name: string; email: string; role: string ; needsInvite: boolean}) {
    this.amqpConnection.publish('barbearia.events', 'user.created', payload);
  }
}