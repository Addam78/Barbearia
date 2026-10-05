import { OmitType, PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateAppointmentDto } from './create-appointment.dto.js';
import { AppointmentStatus } from '../../generated/prisma/enums.js';

// O cliente do agendamento não muda: por isso o clientId não faz parte da atualização.
export class UpdateAppointmentDto extends PartialType(OmitType(CreateAppointmentDto, ['clientId'] as const)) {
  @ApiPropertyOptional({
    enum: AppointmentStatus,
    example: 'CONFIRMED',
    description: 'Novo status. Para só mudar o status, envie apenas este campo.',
  })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;
}
