import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let prisma : PrismaService
  let tx: any

  const admin = { userId: 'admin-1', role: 'ADMIN' }
  const barber = { userId: 'barber-1', role: 'BARBER' }
  const client = { userId: 'client-1', role: 'CLIENT' }

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
            findFirst: vi.fn(),
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
      active: true,
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
    const result = await service.create(barber, dto)

    // 5. verificar
    expect(result).toEqual({
      id: 'appointment-1',
      clientId: 'client-1',
      barberId: 'barber-1',
      serviceId: 'service-1',
      scheduledAt: new Date('2026-09-25T09:00:00.000Z'),
    })
  })

    it('CLIENT agenda sempre para si mesmo, ignorando o clientId enviado', async () => {
      vi.mocked(prisma.service.findUnique).mockResolvedValue({
        id: 'service-1',
        durationMinutes: 30,
        active: true,
      } as any)

      vi.mocked(tx.appointment.create).mockResolvedValue({ id: 'appointment-1' } as any)

      await service.create(client, {
        clientId: 'outro-cliente',
        barberId: 'barber-1',
        serviceId: 'service-1',
        scheduledAt: '2026-09-25T09:00:00.000Z',
      })

      expect(tx.appointment.create).toHaveBeenCalledWith({
        data: {
          clientId: 'client-1',
          barberId: 'barber-1',
          serviceId: 'service-1',
          scheduledAt: new Date('2026-09-25T09:00:00.000Z'),
        },
      })
    })

    it('CLIENT agenda para si mesmo mesmo sem enviar clientId', async () => {
      vi.mocked(prisma.service.findUnique).mockResolvedValue({
        id: 'service-1',
        durationMinutes: 30,
        active: true,
      } as any)

      vi.mocked(tx.appointment.create).mockResolvedValue({ id: 'appointment-1' } as any)

      await service.create(client, {
        barberId: 'barber-1',
        serviceId: 'service-1',
        scheduledAt: '2026-09-25T09:00:00.000Z',
      })

      expect(tx.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ clientId: 'client-1' }),
        }),
      )
    })

    it('BARBER/ADMIN precisam informar o clientId', async () => {
      await expect(
        service.create(admin, {
          barberId: 'barber-1',
          serviceId: 'service-1',
          scheduledAt: '2026-09-25T09:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException)

      expect(prisma.service.findUnique).not.toHaveBeenCalled()
    })

    it('Deve lançar NotFoundException se o serviço não existir', async () => {
      vi.mocked(prisma.service.findUnique).mockResolvedValue(null)

      const dto = {
        clientId: 'client-1',
        barberId: 'barber-1',
        serviceId: 'service-inexistente',
        scheduledAt: '2026-09-25T09:00:00.000Z',
      }

      await expect(service.create(barber, dto)).rejects.toThrow(NotFoundException)
    })

    it('Deve lançar BadRequestException se o serviço estiver desativado', async () => {
      vi.mocked(prisma.service.findUnique).mockResolvedValue({
        id: 'service-1',
        durationMinutes: 30,
        active: false,
      } as any)

      await expect(
        service.create(client, {
          barberId: 'barber-1',
          serviceId: 'service-1',
          scheduledAt: '2026-09-25T09:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException)

      expect(tx.appointment.create).not.toHaveBeenCalled()
    })

    it('Deve lançar ConflictException se o barbeiro já tiver um agendamento no horário', async () => {
      vi.mocked(prisma.service.findUnique).mockResolvedValue({
        id: 'service-1',
        durationMinutes: 30,
        active: true,
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

      await expect(service.create(barber, dto)).rejects.toThrow(ConflictException)
    })
  })

  describe('Listar agendamentos', () => {
    it('Deve retornar todos os agendamentos', async () => {
      vi.mocked(prisma.appointment.findMany).mockResolvedValue([
        { id: 'appointment-1' },
      ] as any)
      vi.mocked(prisma.appointment.count).mockResolvedValue(1)

      const result = await service.findAll(admin)

      expect(result).toEqual({
        data: [{ id: 'appointment-1' }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      })
    })

    it('ADMIN lista sem filtro', async () => {
      vi.mocked(prisma.appointment.findMany).mockResolvedValue([])
      vi.mocked(prisma.appointment.count).mockResolvedValue(0)

      await service.findAll(admin)

      expect(prisma.appointment.findMany).toHaveBeenCalledWith({ where: {}, skip: 0, take: 10 })
      expect(prisma.appointment.count).toHaveBeenCalledWith({ where: {} })
    })

    it('BARBER lista só a própria agenda (findMany e count com o mesmo filtro)', async () => {
      vi.mocked(prisma.appointment.findMany).mockResolvedValue([])
      vi.mocked(prisma.appointment.count).mockResolvedValue(0)

      await service.findAll(barber)

      expect(prisma.appointment.findMany).toHaveBeenCalledWith({
        where: { barberId: 'barber-1' },
        skip: 0,
        take: 10,
      })
      expect(prisma.appointment.count).toHaveBeenCalledWith({ where: { barberId: 'barber-1' } })
    })

    it('CLIENT lista só os próprios agendamentos (findMany e count com o mesmo filtro)', async () => {
      vi.mocked(prisma.appointment.findMany).mockResolvedValue([])
      vi.mocked(prisma.appointment.count).mockResolvedValue(0)

      await service.findAll(client)

      expect(prisma.appointment.findMany).toHaveBeenCalledWith({
        where: { clientId: 'client-1' },
        skip: 0,
        take: 10,
      })
      expect(prisma.appointment.count).toHaveBeenCalledWith({ where: { clientId: 'client-1' } })
    })
  })

  describe('Retornar um agendamento', () => {
    it('Deve retornar um agendamento com base no id', async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
        id: 'appointment-1',
      } as any)

      const result = await service.findOne(admin, 'appointment-1')

      expect(result).toEqual({ id: 'appointment-1' })
    })

    it('CLIENT só encontra o agendamento se ele for dele', async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue({ id: 'appointment-1' } as any)

      await service.findOne(client, 'appointment-1')

      expect(prisma.appointment.findFirst).toHaveBeenCalledWith({
        where: { id: 'appointment-1', clientId: 'client-1' },
      })
    })

    it('Deve lançar NotFoundException se o agendamento não existir ou for de outra pessoa', async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null)

      await expect(service.findOne(client, 'id-inexistente')).rejects.toThrow(NotFoundException)
    })
  })

  describe('Atualizar agendamento', () => {
    it('Deve lançar NotFoundException se o agendamento não existir', async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null)

      await expect(service.update(admin, 'id-inexistente', { status: 'COMPLETED' as any })).rejects.toThrow(
        NotFoundException,
      )
    })

    it('Não permite editar o agendamento de outra pessoa', async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null)

      await expect(
        service.update(client, 'appointment-de-outro', { status: 'CANCELLED' as any }),
      ).rejects.toThrow(NotFoundException)

      expect(prisma.appointment.findFirst).toHaveBeenCalledWith({
        where: { id: 'appointment-de-outro', clientId: 'client-1' },
      })
      expect(prisma.appointment.update).not.toHaveBeenCalled()
    })

    it('Deve atualizar somente o status, sem checar conflito de horário', async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
        id: 'appointment-1',
        barberId: 'barber-1',
        serviceId: 'service-1',
        scheduledAt: new Date('2026-09-25T09:00:00.000Z'),
      } as any)

      vi.mocked(prisma.appointment.update).mockResolvedValue({
        id: 'appointment-1',
        status: 'COMPLETED',
      } as any)

      const result = await service.update(admin, 'appointment-1', { status: 'COMPLETED' as any })

      expect(result).toEqual({ id: 'appointment-1', status: 'COMPLETED' })
      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appointment-1' },
        data: { status: 'COMPLETED' },
      })
    })

    it('Deve reagendar com sucesso quando não há conflito', async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
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

      const result = await service.update(admin, 'appointment-1', {
        scheduledAt: '2026-09-25T10:00:00.000Z',
      } as any)

      expect(result).toEqual({
        id: 'appointment-1',
        scheduledAt: new Date('2026-09-25T10:00:00.000Z'),
      })
    })

    it('Não permite trocar o agendamento para um serviço desativado', async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
        id: 'appointment-1',
        barberId: 'barber-1',
        serviceId: 'service-1',
        scheduledAt: new Date('2026-09-25T09:00:00.000Z'),
      } as any)

      vi.mocked(prisma.service.findUnique).mockResolvedValue({
        id: 'service-2',
        durationMinutes: 30,
        active: false,
      } as any)

      await expect(
        service.update(admin, 'appointment-1', { serviceId: 'service-2' } as any),
      ).rejects.toThrow(BadRequestException)

      expect(tx.appointment.update).not.toHaveBeenCalled()
    })

    it('Permite remarcar o horário de um agendamento cujo serviço foi desativado depois', async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
        id: 'appointment-1',
        barberId: 'barber-1',
        serviceId: 'service-1',
        scheduledAt: new Date('2026-09-25T09:00:00.000Z'),
      } as any)

      vi.mocked(prisma.service.findUnique).mockResolvedValue({
        id: 'service-1',
        durationMinutes: 30,
        active: false,
      } as any)

      vi.mocked(tx.appointment.update).mockResolvedValue({ id: 'appointment-1' } as any)

      await service.update(admin, 'appointment-1', {
        scheduledAt: '2026-09-25T10:00:00.000Z',
      } as any)

      expect(tx.appointment.update).toHaveBeenCalledTimes(1)
    })

    it('Deve lançar ConflictException ao reagendar para um horário ocupado', async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
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

      const result = service.update(admin, 'appointment-1', {
        scheduledAt: '2026-09-25T11:15:00.000Z',
      } as any)

      await expect(result).rejects.toThrow(ConflictException)
    })
  })

  describe('Remover agendamento', () => {
    it('Deve remover um agendamento existente', async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
        id: 'appointment-1',
      } as any)

      await service.remove(admin, 'appointment-1')

      expect(prisma.appointment.delete).toHaveBeenCalledWith({
        where: { id: 'appointment-1' },
      })
    })

    it('Deve lançar NotFoundException se o agendamento não existir', async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null)

      await expect(service.remove(admin, 'id-inexistente')).rejects.toThrow(NotFoundException)
      expect(prisma.appointment.delete).not.toHaveBeenCalled()
    })

    it('Não permite remover o agendamento de outra pessoa', async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null)

      await expect(service.remove(client, 'appointment-de-outro')).rejects.toThrow(NotFoundException)
      expect(prisma.appointment.delete).not.toHaveBeenCalled()
    })
  })
});
