import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { UpdateAppointmentDto } from './dto/update-appointment.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';


@Injectable()
export class AppointmentsService {
  constructor(private prisma:PrismaService){}
  
   async create(dto: CreateAppointmentDto) {
    
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
             clientId: dto.clientId,
             barberId: dto.barberId,
             serviceId: dto.serviceId,
             scheduledAt: startsAt,
           },
         })
       },
       { isolationLevel: 'Serializable' },
     )



  }

  async findAll(page = 1, limit = 10) {
    const [data, total] = await Promise.all([
      this.prisma.appointment.findMany({
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.appointment.count(),
    ])

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async findOne(id: string) {
    const scheduledappointment = await this.prisma.appointment.findUnique({
      where: { id }
    })

    if (!scheduledappointment) {
      throw new NotFoundException('Serviço não encontrado')
    }

    return scheduledappointment
  }



  async update(id: string, dto: UpdateAppointmentDto) {
    const scheduledappointment = await this.prisma.appointment.findUnique({
      where: { id }
    })

    if (!scheduledappointment) {
      throw new NotFoundException('Serviço não encontrado')
    }

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

  async remove (id: string) {
    
     const scheduledappointment = await this.prisma.appointment.findUnique({
      where: { id }
    })

    if(!scheduledappointment){
      throw new NotFoundException('Serviço não existente')
    }

    await this.prisma.appointment.delete({
      where:{id}
    })

  }
}
