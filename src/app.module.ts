import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { UsersModule } from './users/users.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { ServicesModule } from './services/services.module.js';
import { RolesGuard } from './auth/guards/roles.guard.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: isTest ? '.env.test' : '.env',
    }),
    PrismaModule,
    AuthModule,
    // Observabilidade desligada em teste: o worker fica reiniciando e polui a saída.
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ...(isTest
      ? []
      : [
          ObserveModule.forRoot({
            appKey: 'YOUR_APP_KEY',
            appSecret: 'YOUR_APP_SECRET',
            serviceId: 'Barbearia',
          }),
        ]),
    AppointmentsModule,
    UsersModule,
    ServicesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide:APP_GUARD,
      useClass:RolesGuard
    }
  ],
})
export class AppModule {}
