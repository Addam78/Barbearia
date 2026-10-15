import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { UpdateAppointmentDto } from './dto/update-appointment.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';

@Injectable()
export class AppointmentsService {
  constructor(private prisma:PrismaService){}

  // Nomes em vez de só os ids — sem trazer o User/Service inteiro (evita vazar password hasheada).
  private readonly withNames = {
    client: { select: { id: true, name: true } },
    barber: { select: { id: true, name: true } },
    service: { select: { id: true, name: true } },
  }

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
      include: this.withNames,
    })

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado')
    }

    return appointment
  }

  private async assertIsBarber(barberId: string) {
    const barber = await this.prisma.user.findUnique({ where: { id: barberId } })

    if (!barber || barber.role !== Role.BARBER) {
      throw new NotFoundException('Barbeiro não encontrado')
    }
  }

  async create(user: AuthUser, dto: CreateAppointmentDto) {

    const clientId = user.role === 'CLIENT' ? user.userId : dto.clientId

    if (!clientId) {
      throw new BadRequestException('clientId é obrigatório')
    }

    await this.assertIsBarber(dto.barberId)

    const findService = await this.prisma.service.findUnique({
      where : {id:dto.serviceId}
    })

    if(!findService){
      throw new NotFoundException('Serviço não existe ')
    }

    if (!findService.active) {
      throw new BadRequestException('Serviço desativado')
    }

    //findService.durationMinutes --> é  tempo do corte
    const startsAt = new Date(dto.scheduledAt)
    const endAt = new Date(startsAt.getTime() + findService.durationMinutes * 60000)

     return this.prisma.$transaction(
       async (tx) => {
         const barberAppointments = await tx.appointment.findMany({
           where: { barberId: dto.barberId, status: { not: 'CANCELLED' } },
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
        include: this.withNames,
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
        data: { status: dto.status },
        include: this.withNames,
      })
    }

    const serviceId = dto.serviceId ?? scheduledappointment.serviceId
    const barberId = dto.barberId ?? scheduledappointment.barberId

    if (dto.barberId) {
      await this.assertIsBarber(dto.barberId)
    }

    const findService = await this.prisma.service.findUnique({
      where: { id: serviceId }
    })

    if (!findService) {
      throw new NotFoundException('Serviço não existe')
    }

    // Trocar para um serviço desativado não pode; remarcar um agendamento que já usa um serviço desativado pode.
    if (dto.serviceId && !findService.active) {
      throw new BadRequestException('Serviço desativado')
    }

    const startsAt = dto.scheduledAt ? new Date(dto.scheduledAt) : scheduledappointment.scheduledAt
    const endAt = new Date(startsAt.getTime() + findService.durationMinutes * 60000)

    return this.prisma.$transaction(
      async (tx) => {
        const barberAppointments = await tx.appointment.findMany({
          where: { barberId, id: { not: id }, status: { not: 'CANCELLED' } }, // exclui o próprio agendamento e cancelados da checagem
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
          include: this.withNames,
        })
      },
      { isolationLevel: 'Serializable' },
    )

  }

  // Horário de funcionamento: 09h-19h, fechado domingo. Fixo por enquanto (não varia por barbeiro).
  private readonly OPENING_HOUR = 9
  private readonly CLOSING_HOUR = 19

  async getAvailability(barberId: string, date: string, serviceId: string) {
    if (!barberId || !serviceId) {
      throw new BadRequestException('barberId e serviceId são obrigatórios')
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) {
      throw new BadRequestException('date deve estar no formato YYYY-MM-DD')
    }

    await this.assertIsBarber(barberId)

    const service = await this.prisma.service.findUnique({ where: { id: serviceId } })
    if (!service) {
      throw new NotFoundException('Serviço não existe')
    }
    if (!service.active) {
      throw new BadRequestException('Serviço desativado')
    }

    const dayStart = new Date(`${date}T00:00:00.000Z`)
    if (Number.isNaN(dayStart.getTime())) {
      throw new BadRequestException('date inválida')
    }

    if (dayStart.getUTCDay() === 0) {
      return { date, barberId, serviceId, slots: [] } // fechado aos domingos
    }

    const open = new Date(`${date}T${String(this.OPENING_HOUR).padStart(2, '0')}:00:00.000Z`)
    const close = new Date(`${date}T${String(this.CLOSING_HOUR).padStart(2, '0')}:00:00.000Z`)
    const durationMs = service.durationMinutes * 60000

    const nextDay = new Date(dayStart.getTime() + 24 * 60 * 60000)
    const dayAppointments = await this.prisma.appointment.findMany({
      where: {
        barberId,
        status: { not: 'CANCELLED' },
        scheduledAt: { gte: dayStart, lt: nextDay },
      },
      include: { service: true },
    })

    const busy = dayAppointments.map((appointment) => ({
      start: appointment.scheduledAt,
      end: new Date(appointment.scheduledAt.getTime() + appointment.service.durationMinutes * 60000),
    }))

    const slots: string[] = []
    for (let slotStart = open; slotStart.getTime() + durationMs <= close.getTime(); slotStart = new Date(slotStart.getTime() + durationMs)) {
      const slotEnd = new Date(slotStart.getTime() + durationMs)
      const overlaps = busy.some((b) => b.start < slotEnd && slotStart < b.end)
      if (!overlaps) {
        slots.push(slotStart.toISOString())
      }
    }

    return { date, barberId, serviceId, slots }
  }

  async remove (user: AuthUser, id: string) {
    await this.findOwned(user, id)

    await this.prisma.appointment.delete({
      where:{id}
    })

  }
}
