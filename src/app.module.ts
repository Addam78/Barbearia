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

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport: isTest
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
    
    PrismaModule,
    AuthModule,
    AppointmentsModule,
    UsersModule,
    ServicesModule,
    NotificationsModule
  ],
  providers: [
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
