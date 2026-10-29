import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { UpdateAppointmentDto } from './dto/update-appointment.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthUser } from '../auth/decorators/current-user.decorator.js';

@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @ApiOperation({
    summary: 'Criar agendamento',
    description:
      'Marca um horário com um barbeiro para um serviço. O `CLIENT` agenda sempre para si mesmo (o `clientId` vem do token e o enviado no corpo é ignorado). `BARBER` e `ADMIN` precisam informar o `clientId`. Retorna 409 se o barbeiro já tiver um horário que se sobreponha, considerando a duração do serviço, e 404 se o serviço não existir.',
  })
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(user, dto)
  }

  @ApiOperation({
    summary: 'Listar agendamentos',
    description:
      'Lista paginada (`?page=1&limit=10`), de acordo com o perfil: o `CLIENT` vê só os próprios, o `BARBER` vê só a própria agenda e o `ADMIN` vê todos.',
  })
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.appointmentsService.findAll(user, Number(page) || 1, Number(limit) || 10);
  }

  @ApiOperation({
    summary: 'Horários disponíveis de um barbeiro em um dia',
    description:
      'Dado `barberId`, `date` (`YYYY-MM-DD`) e `serviceId` (define a duração do corte), retorna os horários livres daquele dia, considerando o horário de funcionamento (09h–19h, fechado domingo) e os horários já ocupados do barbeiro. Não expõe de quem são os horários ocupados, só quais estão livres. Acessível a qualquer usuário logado.',
  })
  @Get('availability')
  getAvailability(
    @Query('barberId') barberId: string,
    @Query('date') date: string,
    @Query('serviceId') serviceId: string,
  ) {
    return this.appointmentsService.getAvailability(barberId, date, serviceId);
  }

  @ApiOperation({
    summary: 'Buscar agendamento por id',
    description:
      'Retorna 404 se o agendamento não existir **ou** não for seu (o `ADMIN` enxerga todos). Isso evita revelar que o id existe.',
  })
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.appointmentsService.findOne(user, id);
  }

  @ApiOperation({
    summary: 'Atualizar status ou reagendar',
    description:
      'Envie só `status` (`PENDING`, `CONFIRMED`, `CANCELLED` ou `COMPLETED`) para mudar o estado, ou `scheduledAt`/`barberId`/`serviceId` para reagendar. No reagendamento o horário é revalidado (409 se houver conflito). Um agendamento `CANCELLED` não pode ser reativado (409): crie um novo. Retorna 404 se o agendamento não existir ou não for seu.',
  })
  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointmentsService.update(user, id, dto);
  }

  @ApiOperation({
    summary: 'Remover agendamento',
    description: 'Apaga o agendamento. Retorna 404 se ele não existir ou não for seu (o `ADMIN` enxerga todos).',
  })
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.appointmentsService.remove(user, id);
  }
}
