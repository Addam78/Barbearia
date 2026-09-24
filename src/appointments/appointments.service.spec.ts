import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let prisma : PrismaService
  let tx: any

  beforeEach(async () => {
    tx = {                           
      appointment: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
      },
    }


    const module: TestingModule = await Test.createTestingModule({
       providers: [
      AppointmentsService,
      {
        provide: PrismaService,
        useValue: {
          service: {
            findUnique: vi.fn(),
          },
          appointment: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            count: vi.fn(),
          },
          $transaction: vi.fn((callback) => callback(tx)),
        },
      },
    ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    prisma = module.get<PrismaService>(PrismaService)
  });


  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Criar agendamento', () => {
 
    it('Deve criar um agendamento com sucesso', async () => {
    // 1. mockar o serviço existente (com durationMinutes)
    vi.mocked(prisma.service.findUnique).mockResolvedValue({
      id: 'service-1',
      name: 'Corte simples',
      durationMinutes: 30,
    } as any)

    // 2. dto de exemplo
    const dto = {
      clientId: 'client-1',
      barberId: 'barber-1',
      serviceId: 'service-1',
      scheduledAt: '2026-09-25T09:00:00.000Z',
    }

    // 3. mockar o retorno da criação dentro da transação
    vi.mocked(tx.appointment.create).mockResolvedValue({
      id: 'appointment-1',
      clientId: 'client-1',
      barberId: 'barber-1',
      serviceId: 'service-1',
      scheduledAt: new Date('2026-09-25T09:00:00.000Z'),
    } as any)

    // 4. chamar o service
    const result = await service.create(dto)

    // 5. verificar
    expect(result).toEqual({
      id: 'appointment-1',
      clientId: 'client-1',
      barberId: 'barber-1',
      serviceId: 'service-1',
      scheduledAt: new Date('2026-09-25T09:00:00.000Z'),
    })
  })

    it('Deve lançar NotFoundException se o serviço não existir', async () => {
      vi.mocked(prisma.service.findUnique).mockResolvedValue(null)

      const dto = {
        clientId: 'client-1',
        barberId: 'barber-1',
        serviceId: 'service-inexistente',
        scheduledAt: '2026-09-25T09:00:00.000Z',
      }

      await expect(service.create(dto)).rejects.toThrow(NotFoundException)
    })

    it('Deve lançar ConflictException se o barbeiro já tiver um agendamento no horário', async () => {
      vi.mocked(prisma.service.findUnique).mockResolvedValue({
        id: 'service-1',
        durationMinutes: 30,
      } as any)

      vi.mocked(tx.appointment.findMany).mockResolvedValue([
        {
          id: 'appointment-existente',
          barberId: 'barber-1',
          scheduledAt: new Date('2026-09-25T09:00:00.000Z'),
          service: { durationMinutes: 30 },
        },
      ] as any)

      const dto = {
        clientId: 'client-1',
        barberId: 'barber-1',
        serviceId: 'service-1',
        scheduledAt: '2026-09-25T09:15:00.000Z', // dentro do intervalo do agendamento existente
      }

      await expect(service.create(dto)).rejects.toThrow(ConflictException)
    })
  })

  describe('Listar agendamentos', () => {
    it('Deve retornar todos os agendamentos', async () => {
      vi.mocked(prisma.appointment.findMany).mockResolvedValue([
        { id: 'appointment-1' },
      ] as any)
      vi.mocked(prisma.appointment.count).mockResolvedValue(1)

      const result = await service.findAll()

      expect(result).toEqual({
        data: [{ id: 'appointment-1' }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      })
    })
  })

  describe('Retornar um agendamento', () => {
    it('Deve retornar um agendamento com base no id', async () => {
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
        id: 'appointment-1',
      } as any)

      const result = await service.findOne('appointment-1')

      expect(result).toEqual({ id: 'appointment-1' })
    })

    it('Deve lançar NotFoundException se o agendamento não existir', async () => {
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue(null)

      await expect(service.findOne('id-inexistente')).rejects.toThrow(NotFoundException)
    })
  })

  describe('Atualizar agendamento', () => {
    it('Deve lançar NotFoundException se o agendamento não existir', async () => {
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue(null)

      await expect(service.update('id-inexistente', { status: 'COMPLETED' as any })).rejects.toThrow(
        NotFoundException,
      )
    })

    it('Deve atualizar somente o status, sem checar conflito de horário', async () => {
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
        id: 'appointment-1',
        barberId: 'barber-1',
        serviceId: 'service-1',
        scheduledAt: new Date('2026-09-25T09:00:00.000Z'),
      } as any)

      vi.mocked(prisma.appointment.update).mockResolvedValue({
        id: 'appointment-1',
        status: 'COMPLETED',
      } as any)

      const result = await service.update('appointment-1', { status: 'COMPLETED' as any })

      expect(result).toEqual({ id: 'appointment-1', status: 'COMPLETED' })
      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appointment-1' },
        data: { status: 'COMPLETED' },
      })
    })

    it('Deve reagendar com sucesso quando não há conflito', async () => {
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
        id: 'appointment-1',
        barberId: 'barber-1',
        serviceId: 'service-1',
        scheduledAt: new Date('2026-09-25T09:00:00.000Z'),
      } as any)

      vi.mocked(prisma.service.findUnique).mockResolvedValue({
        id: 'service-1',
        durationMinutes: 30,
      } as any)

      vi.mocked(tx.appointment.update).mockResolvedValue({
        id: 'appointment-1',
        scheduledAt: new Date('2026-09-25T10:00:00.000Z'),
      } as any)

      const result = await service.update('appointment-1', {
        scheduledAt: '2026-09-25T10:00:00.000Z',
      } as any)

      expect(result).toEqual({
        id: 'appointment-1',
        scheduledAt: new Date('2026-09-25T10:00:00.000Z'),
      })
    })

    it('Deve lançar ConflictException ao reagendar para um horário ocupado', async () => {
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
        id: 'appointment-1',
        barberId: 'barber-1',
        serviceId: 'service-1',
        scheduledAt: new Date('2026-09-25T09:00:00.000Z'),
      } as any)

      vi.mocked(prisma.service.findUnique).mockResolvedValue({
        id: 'service-1',
        durationMinutes: 30,
      } as any)

      vi.mocked(tx.appointment.findMany).mockResolvedValue([
        {
          id: 'outro-agendamento',
          barberId: 'barber-1',
          scheduledAt: new Date('2026-09-25T11:00:00.000Z'),
          service: { durationMinutes: 30 },
        },
      ] as any)

      const result = service.update('appointment-1', {
        scheduledAt: '2026-09-25T11:15:00.000Z',
      } as any)

      await expect(result).rejects.toThrow(ConflictException)
    })
  })

  describe('Remover agendamento', () => {
    it('Deve remover um agendamento existente', async () => {
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
        id: 'appointment-1',
      } as any)

      await service.remove('appointment-1')

      expect(prisma.appointment.delete).toHaveBeenCalledWith({
        where: { id: 'appointment-1' },
      })
    })

    it('Deve lançar NotFoundException se o agendamento não existir', async () => {
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue(null)

      await expect(service.remove('id-inexistente')).rejects.toThrow(NotFoundException)
      expect(prisma.appointment.delete).not.toHaveBeenCalled()
    })
  })
});
