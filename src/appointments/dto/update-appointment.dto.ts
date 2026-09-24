import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateAppointmentDto } from './create-appointment.dto.js';
import { AppointmentStatus } from '../../generated/prisma/enums.js';

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;
}