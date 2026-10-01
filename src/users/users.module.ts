import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports : [NotificationsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
