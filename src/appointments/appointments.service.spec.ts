import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let prisma : PrismaService
  let tx: any

  const admin = { userId: 'admin-1', role: 'ADMIN' }
  const barber = { userId: 'barber-1', role: 'BARBER' }
  const client = { userId: 'client-1', role: 'CLIENT' }

  // Espelha o `withNames` privado do AppointmentsService (include de nome em vez de só o id).
  const withNames = {
    client: { select: { id: true, name: true } },
    barber: { select: { id: true, name: true } },
    service: { select: { id: true, name: true } },
  }

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
          user: {
            findUnique: vi.fn().mockResolvedValue({ id: 'barber-1', role: 'BARBER' }),
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

    // "Agora" fixo antes das datas usadas nos testes (set/2026), para a regra de
    // "não agendar no passado" não depender do dia em que a suíte roda.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-01T12:00:00.000Z'))
  });

  afterEach(() => {
    vi.useRealTimers()
  })


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

    it('A checagem de sobreposição lê só uma janela de tempo, não todo o histórico do barbeiro', async () => {
      vi.mocked(prisma.service.findUnique).mockResolvedValue({
        id: 'service-1',
        durationMinutes: 30,
        active: true,
      } as any)
      vi.mocked(tx.appointment.create).mockResolvedValue({ id: 'appointment-1' } as any)

      await service.create(barber, {
        clientId: 'client-1',
        barberId: 'barber-1',
        serviceId: 'service-1',
        scheduledAt: '2026-09-25T12:00:00.000Z',
      })

      // Pedido: 12h00 a 12h30. Janela: de 24h antes do início até o fim do pedido.
      expect(tx.appointment.findMany).toHaveBeenCalledWith({
        where: {
          barberId: 'barber-1',
          status: { not: 'CANCELLED' },
          scheduledAt: {
            gte: new Date('2026-09-24T12:00:00.000Z'),
            lt: new Date('2026-09-25T12:30:00.000Z'),
          },
        },
        include: { service: true },
      })
    })

    it('Ainda recusa uma sobreposição dentro da janela', async () => {
      vi.mocked(prisma.service.findUnique).mockResolvedValue({
        id: 'service-1',
        durationMinutes: 30,
        active: true,
      } as any)
      // Existente às 12h15 (30 min): cai dentro do pedido das 12h00 às 12h30.
      vi.mocked(tx.appointment.findMany).mockResolvedValue([
        { scheduledAt: new Date('2026-09-25T12:15:00.000Z'), service: { durationMinutes: 30 } },
      ] as any)

      await expect(
        service.create(barber, {
          clientId: 'client-1',
          barberId: 'barber-1',
          serviceId: 'service-1',
          scheduledAt: '2026-09-25T12:00:00.000Z',
        }),
      ).rejects.toThrow(ConflictException)

      expect(tx.appointment.create).not.toHaveBeenCalled()
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

    it('Deve lançar NotFoundException se barberId não for de um usuário BARBER', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'client-2', role: 'CLIENT' } as any)

      const dto = {
        clientId: 'client-1',
        barberId: 'client-2',
        serviceId: 'service-1',
        scheduledAt: '2026-09-25T09:00:00.000Z',
      }

      await expect(service.create(barber, dto)).rejects.toThrow(NotFoundException)
      expect(prisma.service.findUnique).not.toHaveBeenCalled()
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

      expect(prisma.appointment.findMany).toHaveBeenCalledWith({ where: {}, skip: 0, take: 10, include: withNames })
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
        include: withNames,
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
        include: withNames,
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
        include: withNames,
      })
    })

    it('Deve lançar NotFoundException se o agendamento não existir ou for de outra pessoa', async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null)

      await expect(service.findOne(client, 'id-inexistente')).rejects.toThrow(NotFoundException)
    })
  })

  describe('Reservas simultâneas', () => {
    const dto = {
      clientId: 'client-1',
      barberId: 'barber-1',
      serviceId: 'service-1',
      scheduledAt: '2026-09-25T13:00:00.000Z',
    }

    beforeEach(() => {
      vi.mocked(prisma.service.findUnique).mockResolvedValue({
        id: 'service-1',
        durationMinutes: 30,
        active: true,
      } as any)
    })

    it.each(['P2034', 'P2002'])('Converte erro %s do banco em ConflictException (409)', async (code) => {
      vi.mocked(prisma.$transaction).mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('conflito', { code, clientVersion: 'test' }),
      )

      await expect(service.create(admin, dto as any)).rejects.toThrow(ConflictException)
    })

    it('Não mascara outros erros do banco', async () => {
      vi.mocked(prisma.$transaction).mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('outro erro', { code: 'P2003', clientVersion: 'test' }),
      )

      await expect(service.create(admin, dto as any)).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError)
    })

  })

  describe('Reativação de agendamento cancelado', () => {
    const cancelled = {
      id: 'appointment-1',
      barberId: 'barber-1',
      serviceId: 'service-1',
      scheduledAt: new Date('2026-09-25T13:00:00.000Z'),
      status: 'CANCELLED',
    }

    it('Não deixa reativar um cancelado (409), sem tocar no banco', async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue(cancelled as any)

      for (const status of ['PENDING', 'CONFIRMED', 'COMPLETED']) {
        await expect(
          service.update(admin, 'appointment-1', { status: status as any }),
        ).rejects.toThrow(ConflictException)
      }

      expect(prisma.appointment.update).not.toHaveBeenCalled()
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('Também recusa reativar junto de um reagendamento', async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue(cancelled as any)

      await expect(
        service.update(admin, 'appointment-1', {
          status: 'PENDING' as any,
          scheduledAt: '2030-09-25T14:00:00.000Z',
        } as any),
      ).rejects.toThrow(ConflictException)

      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('Reenviar CANCELLED num cancelado continua permitido', async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue(cancelled as any)
      vi.mocked(prisma.appointment.update).mockResolvedValue({ ...cancelled } as any)

      await expect(
        service.update(admin, 'appointment-1', { status: 'CANCELLED' as any }),
      ).resolves.toBeDefined()
    })

    it('Cancelar um agendamento pendente continua funcionando', async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue({ ...cancelled, status: 'PENDING' } as any)
      vi.mocked(prisma.appointment.update).mockResolvedValue({ ...cancelled } as any)

      await service.update(admin, 'appointment-1', { status: 'CANCELLED' as any })

      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appointment-1' },
        data: { status: 'CANCELLED' },
        include: withNames,
      })
    })
  })

  describe('Agendamento no passado', () => {
    it('Não permite criar agendamento em horário que já passou', async () => {
      await expect(
        service.create(admin, {
          clientId: 'client-1',
          barberId: 'barber-1',
          serviceId: 'service-1',
          scheduledAt: '2026-08-31T12:00:00.000Z', // antes do "agora" fixo (01/09)
        } as any),
      ).rejects.toThrow(BadRequestException)

      expect(tx.appointment.create).not.toHaveBeenCalled()
    })

    it('Não permite reagendar para um horário que já passou', async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
        id: 'appointment-1',
        barberId: 'barber-1',
        serviceId: 'service-1',
        scheduledAt: new Date('2026-09-25T09:00:00.000Z'),
      } as any)

      await expect(
        service.update(admin, 'appointment-1', { scheduledAt: '2026-08-31T12:00:00.000Z' } as any),
      ).rejects.toThrow(BadRequestException)

      expect(tx.appointment.update).not.toHaveBeenCalled()
    })

    it('Aceita scheduledAt inválido como 400, não como erro interno', async () => {
      await expect(
        service.create(admin, {
          clientId: 'client-1',
          barberId: 'barber-1',
          serviceId: 'service-1',
          scheduledAt: 'nao-e-uma-data',
        } as any),
      ).rejects.toThrow(BadRequestException)
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
        include: withNames,
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
        include: withNames,
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

  describe('Horários disponíveis', () => {
    beforeEach(() => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'barber-1', role: 'BARBER' } as any)
      vi.mocked(prisma.service.findUnique).mockResolvedValue({
        id: 'service-1',
        durationMinutes: 60,
        active: true,
      } as any)
    })

    it('Retorna lista vazia aos domingos (fechado)', async () => {
      const result = await service.getAvailability('barber-1', '2026-09-27', 'service-1') // domingo

      expect(result.slots).toEqual([])
    })

    it('Retorna os horários do dia, excluindo o que já está ocupado', async () => {
      vi.mocked(prisma.appointment.findMany).mockResolvedValue([
        {
          scheduledAt: new Date('2026-09-28T09:00:00-03:00'), // segunda, 9h em Brasília
          service: { durationMinutes: 60 },
        },
      ] as any)

      const result = await service.getAvailability('barber-1', '2026-09-28', 'service-1')

      // Slots voltam em UTC (ISO): 9h em Brasília = 12:00Z
      expect(result.slots).not.toContain('2026-09-28T12:00:00.000Z')
      expect(result.slots).toContain('2026-09-28T13:00:00.000Z') // 10h em Brasília
      expect(result.slots[result.slots.length - 1]).toBe('2026-09-28T21:00:00.000Z') // 18h em Brasília, último que cabe até 19h
    })

    it('Usa o horário de Brasília para abrir (9h) e para a janela do dia', async () => {
      vi.mocked(prisma.appointment.findMany).mockResolvedValue([])

      const result = await service.getAvailability('barber-1', '2026-09-28', 'service-1')

      expect(result.slots[0]).toBe('2026-09-28T12:00:00.000Z') // 9h em Brasília, não 6h
      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scheduledAt: {
              gte: new Date('2026-09-28T03:00:00.000Z'), // meia-noite em Brasília
              lt: new Date('2026-09-29T03:00:00.000Z'),
            },
          }),
        }),
      )
    })

    it('Na grade de hoje, não oferece horários que já passaram', async () => {
      // "agora" = 01/09 às 14h30 em Brasília
      vi.setSystemTime(new Date('2026-09-01T14:30:00-03:00'))
      vi.mocked(prisma.appointment.findMany).mockResolvedValue([])

      const result = await service.getAvailability('barber-1', '2026-09-01', 'service-1')

      expect(result.slots[0]).toBe('2026-09-01T18:00:00.000Z') // 15h em Brasília: primeiro horário depois de agora
      expect(result.slots).not.toContain('2026-09-01T17:00:00.000Z') // 14h já passou
    })

    it('Deve lançar NotFoundException se barberId não for de um BARBER', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'client-1', role: 'CLIENT' } as any)

      await expect(service.getAvailability('client-1', '2026-09-28', 'service-1')).rejects.toThrow(
        NotFoundException,
      )
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
