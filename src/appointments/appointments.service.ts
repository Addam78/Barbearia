import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { UpdateAppointmentDto } from './dto/update-appointment.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class AppointmentsService {
  constructor(private prisma:PrismaService){}

  // Duas reservas simultâneas para o mesmo horário: a transação Serializable aborta uma delas (P2034)
  // ou o índice único parcial barra a segunda (P2002). Nos dois casos é conflito de horário, não erro 500.
  private async withSlotConflictAs409<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2034' || error.code === 'P2002')
      ) {
        throw new ConflictException('Horário acabou de ser reservado por outro cliente. Escolha outro horário.')
      }
      throw error
    }
  }

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

  private assertIsFuture(startsAt: Date) {
    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException('scheduledAt inválido')
    }
    if (startsAt.getTime() <= Date.now()) {
      throw new BadRequestException('Não é possível agendar em um horário que já passou')
    }
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

    this.assertIsFuture(new Date(dto.scheduledAt))

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

     return this.withSlotConflictAs409(() => this.prisma.$transaction(
       async (tx) => {
         const barberAppointments = await tx.appointment.findMany({
           where: {
             barberId: dto.barberId,
             status: { not: 'CANCELLED' },
             scheduledAt: this.overlapWindow(startsAt, endAt),
           },
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
     ))

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

    // Cancelado não volta a ficar ativo: reativar pularia a checagem de sobreposição (o índice único
    // parcial só pega início idêntico). Quem quer o horário de novo cria um agendamento novo.
    if (scheduledappointment.status === 'CANCELLED' && dto.status && dto.status !== 'CANCELLED') {
      throw new ConflictException('Agendamento cancelado não pode ser reativado. Crie um novo agendamento.')
    }

    const isReschedule = dto.scheduledAt || dto.barberId || dto.serviceId

    if (!isReschedule) {
      return this.prisma.appointment.update({
        where: { id },
        data: { status: dto.status },
        include: this.withNames,
      })
    }

    // Só valida quando a data muda: trocar barbeiro/serviço de um agendamento já existente não depende disso.
    if (dto.scheduledAt) {
      this.assertIsFuture(new Date(dto.scheduledAt))
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

    return this.withSlotConflictAs409(() => this.prisma.$transaction(
      async (tx) => {
        const barberAppointments = await tx.appointment.findMany({
          where: {
            barberId,
            id: { not: id }, // exclui o próprio agendamento
            status: { not: 'CANCELLED' }, // e os cancelados da checagem
            scheduledAt: this.overlapWindow(startsAt, endAt),
          },
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
    ))

  }

  // Horário de funcionamento: 09h-19h no horário de Brasília, fechado domingo. Fixo por enquanto (não varia por barbeiro).
  private readonly OPENING_HOUR = 9
  private readonly CLOSING_HOUR = 19
  // Offset fixo de America/Sao_Paulo: o Brasil não tem horário de verão desde 2019.
  private readonly TZ_OFFSET = '-03:00'

  // Janela de início dos agendamentos que PODEM se sobrepor a [startsAt, endAt): quem começa depois de
  // endAt não se sobrepõe, e quem começou mais de MAX_SERVICE_MINUTES antes de startsAt já terminou
  // (nenhum serviço dura mais que isso: ver `durationMinutes` em CreateServiceDto). Assim a checagem lê
  // só uns poucos agendamentos em vez de todo o histórico do barbeiro, o que também reduz os abortos
  // da transação Serializable. A conta exata de sobreposição continua sendo feita depois.
  private readonly MAX_SERVICE_MINUTES = 24 * 60

  private overlapWindow(startsAt: Date, endAt: Date) {
    return { gte: new Date(startsAt.getTime() - this.MAX_SERVICE_MINUTES * 60000), lt: endAt }
  }

  // Converte "YYYY-MM-DD" + hora local da barbearia em um instante (Date em UTC).
  private localTime(date: string, hour: number) {
    return new Date(`${date}T${String(hour).padStart(2, '0')}:00:00${this.TZ_OFFSET}`)
  }

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

    // Meia-noite no horário de Brasília (03:00 UTC), não meia-noite UTC.
    const dayStart = this.localTime(date, 0)
    if (Number.isNaN(dayStart.getTime())) {
      throw new BadRequestException('date inválida')
    }

    // Meio-dia local evita erro de virada de dia ao descobrir o dia da semana.
    if (this.localTime(date, 12).getUTCDay() === 0) {
      return { date, barberId, serviceId, slots: [] } // fechado aos domingos
    }

    const open = this.localTime(date, this.OPENING_HOUR)
    const close = this.localTime(date, this.CLOSING_HOUR)
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

    const now = Date.now()
    const slots: string[] = []
    for (let slotStart = open; slotStart.getTime() + durationMs <= close.getTime(); slotStart = new Date(slotStart.getTime() + durationMs)) {
      if (slotStart.getTime() <= now) continue // horário que já passou (relevante quando date = hoje)

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
