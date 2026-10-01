import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { NotificationsService } from './notifications.service.js';
import { NotificationsConsumer } from './notifications.consumer.js';
import { MailService } from './mail.service.js';

@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        exchanges: [
          { name: 'barbearia.events', type: 'topic' },
          { name: 'barbearia.events.dlx', type: 'topic' },
        ],
        queues: [
          {
            name: 'email.failed',
            exchange: 'barbearia.events.dlx',
            routingKey: '#',
          },
        ],
        uri: config.get<string>('AMQP_URL'),
        connectionInitOptions: { wait: false },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [NotificationsService, NotificationsConsumer,MailService],
  exports: [NotificationsService],
})
export class NotificationsModule {}