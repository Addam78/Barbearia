import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Limite de requisições por IP. Só vale para HTTP: os handlers de mensageria (@RabbitSubscribe),
 * como o do e-mail de convite, também passam pelos guards globais e não têm IP nem resposta HTTP.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return Promise.resolve(true);
    }

    return super.canActivate(context);
  }
}
