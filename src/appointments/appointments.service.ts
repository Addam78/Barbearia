import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { UpdateAppointmentDto } from './dto/update-appointment.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface AuthUser {
  userId: string;
  role: string;
}

@Injectable()
export class AppointmentsService {
  constructor(private prisma:PrismaService){}

  // Filtro de visibilidade: ADMIN vê tudo, BARBER só a própria agenda, CLIENT só os próprios agendamentos.
  private scopeFor(user: AuthUser) {
    if (user.role === 'ADMIN') return {}
    if (user.role === 'BARBER') return { barberId: user.userId }
    return { clientId: user.userId }
  }

  // 404 (e não 403) quando o agendamento é de outra pessoa, para não revelar que o id existe.
  private async findOwned(user: AuthUser, id: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, ...this.scopeFor(user) },
    })

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado')
    }

    return appointment
  }

  async create(user: AuthUser, dto: CreateAppointmentDto) {

    const clientId = user.role === 'CLIENT' ? user.userId : dto.clientId

    if (!clientId) {
      throw new BadRequestException('clientId é obrigatório')
    }

    const findService = await this.prisma.service.findUnique({
      where : {id:dto.serviceId}
    })

    if(!findService){
      throw new NotFoundException('Serviço não existe ')
    }

    //findService.durationMinutes --> é  tempo do corte
    const startsAt = new Date(dto.scheduledAt)
    const endAt = new Date(startsAt.getTime() + findService.durationMinutes * 60000)

     return this.prisma.$transaction(
       async (tx) => {
         const barberAppointments = await tx.appointment.findMany({
           where: { barberId: dto.barberId },
           include: { service: true },
         })

         const hasConflict = barberAppointments.some((appointment) => {
           const existingEnd = new Date(
             appointment.scheduledAt.getTime() + appointment.service.durationMinutes * 60000,
           )
           return appointment.scheduledAt < endAt && startsAt < existingEnd
         })

         if (hasConflict) {
           throw new ConflictException('Horário indisponível para este barbeiro')
         }

         return tx.appointment.create({
           data: {
             clientId,
             barberId: dto.barberId,
             serviceId: dto.serviceId,
             scheduledAt: startsAt,
           },
         })
       },
       { isolationLevel: 'Serializable' },
     )

  }

  async findAll(user: AuthUser, page = 1, limit = 10) {
    const where = this.scopeFor(user)

    const [data, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ])

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async findOne(user: AuthUser, id: string) {
    return this.findOwned(user, id)
  }

  async update(user: AuthUser, id: string, dto: UpdateAppointmentDto) {
    const scheduledappointment = await this.findOwned(user, id)

    const isReschedule = dto.scheduledAt || dto.barberId || dto.serviceId

    if (!isReschedule) {
      return this.prisma.appointment.update({
        where: { id },
        data: { status: dto.status }
      })
    }

    const serviceId = dto.serviceId ?? scheduledappointment.serviceId
    const barberId = dto.barberId ?? scheduledappointment.barberId

    const findService = await this.prisma.service.findUnique({
      where: { id: serviceId }
    })

    if (!findService) {
      throw new NotFoundException('Serviço não existe')
    }

    const startsAt = dto.scheduledAt ? new Date(dto.scheduledAt) : scheduledappointment.scheduledAt
    const endAt = new Date(startsAt.getTime() + findService.durationMinutes * 60000)

    return this.prisma.$transaction(
      async (tx) => {
        const barberAppointments = await tx.appointment.findMany({
          where: { barberId, id: { not: id } }, // exclui o próprio agendamento da checagem
          include: { service: true },
        })

        const hasConflict = barberAppointments.some((appointment) => {
          const existingEnd = new Date(
            appointment.scheduledAt.getTime() + appointment.service.durationMinutes * 60000,
          )
          return appointment.scheduledAt < endAt && startsAt < existingEnd
        })

        if (hasConflict) {
          throw new ConflictException('Horário indisponível para este barbeiro')
        }

        return tx.appointment.update({
          where: { id },
          data: { barberId, serviceId, scheduledAt: startsAt, status: dto.status },
        })
      },
      { isolationLevel: 'Serializable' },
    )

  }

  async remove (user: AuthUser, id: string) {
    await this.findOwned(user, id)

    await this.prisma.appointment.delete({
      where:{id}
    })

  }
}
