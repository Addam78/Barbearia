import { Module } from '@nestjs/common';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { UsersModule } from './users/users.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { ServicesModule } from './services/services.module.js';
import { RolesGuard } from './auth/guards/roles.guard.js';
import { LoggerModule } from 'nestjs-pino';
import { NotificationsModule } from './notifications/notifications.module.js';
import { HealthController } from './health.controller.js';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppThrottlerGuard } from './auth/guards/throttler.guard.js';

const isTest = process.env.NODE_ENV === 'test';
const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        // pino-pretty é dependência de desenvolvimento: só colore o log no seu terminal.
        // Em produção ele nem está instalado, então o log sai em JSON (uma linha por evento).
        transport:
          isTest || isProduction
            ? undefined
            : { target: 'pino-pretty', options: { colorize: true } },
        level: isTest ? 'silent' : 'info',
        redact: ['req.headers.authorization', 'req.body.password'], // nunca logar token/senha
      },
    }),


    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: isTest ? '.env.test' : '.env',
    }),
    
    // Limite padrão de requisições por IP; as rotas de autenticação têm limites mais baixos (@Throttle).
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
      // Nos testes e2e dezenas de logins partem do mesmo IP, então o limite fica desligado, a menos que
      // o próprio teste de limite o ligue com THROTTLE_E2E=1.
      skipIf: () => isTest && process.env.THROTTLE_E2E !== '1',
    }),

    PrismaModule,
    AuthModule,
    AppointmentsModule,
    UsersModule,
    ServicesModule,
    NotificationsModule
  ],
  controllers: [HealthController],
  providers: [
    // Primeiro: derruba o excesso de requisições antes de gastar tempo validando token.
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard
    }
  ],
})
export class AppModule {}
