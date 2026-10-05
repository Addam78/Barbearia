import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { ServicesService } from './services.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('ServicesService', () => {
  let service: ServicesService;
  let prisma: PrismaService;

  const admin = { userId: 'admin-1', role: 'ADMIN' };
  const barber = { userId: 'barber-1', role: 'BARBER' };
  const client = { userId: 'client-1', role: 'CLIENT' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        {
          provide: PrismaService,
          useValue: {
            service: {
              findUnique: vi.fn(),
              findFirst: vi.fn(),
              create: vi.fn(),
              findMany: vi.fn(),
              update: vi.fn(),
              count: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createService', () => {
    it('deve criar um serviço', async () => {
      vi.mocked(prisma.service.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.service.create).mockResolvedValue({
        id: 'service-1',
        name: 'Corte americano',
        price: 20,
        durationMinutes: 40,
      } as any);

      const result = await service.createService({
        name: 'Corte americano',
        price: 20,
        durationMinutes: 40,
      });

      expect(result).toEqual({
        id: 'service-1',
        name: 'Corte americano',
        price: 20,
        durationMinutes: 40,
      });
      expect(prisma.service.create).toHaveBeenCalledTimes(1);
    });

    it('deve lançar ConflictException se o nome já existir', async () => {
      vi.mocked(prisma.service.findUnique).mockResolvedValue({
        id: 'service-1',
        name: 'Corte americano',
        active: true,
      } as any);

      await expect(
        service.createService({
          name: 'Corte americano',
          price: 20,
          durationMinutes: 40,
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.service.create).not.toHaveBeenCalled();
    });

    it('avisa que o serviço existente está desativado e sugere reativar', async () => {
      vi.mocked(prisma.service.findUnique).mockResolvedValue({
        id: 'service-1',
        name: 'Corte americano',
        active: false,
      } as any);

      await expect(
        service.createService({ name: 'Corte americano', price: 20, durationMinutes: 40 }),
      ).rejects.toThrow('desativado');

      expect(prisma.service.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const services = [
      { id: 'service-1', name: 'Corte americano', price: 20, durationMinutes: 40, active: true },
    ];

    it('deve retornar a lista de serviços paginada', async () => {
      vi.mocked(prisma.service.findMany).mockResolvedValue(services as any);
      vi.mocked(prisma.service.count).mockResolvedValue(1);

      const result = await service.findAll(admin);

      expect(result).toEqual({
        data: services,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('CLIENT lista só serviços ativos (findMany e count com o mesmo filtro)', async () => {
      vi.mocked(prisma.service.findMany).mockResolvedValue([]);
      vi.mocked(prisma.service.count).mockResolvedValue(0);

      await service.findAll(client);

      expect(prisma.service.findMany).toHaveBeenCalledWith({
        where: { active: true },
        skip: 0,
        take: 10,
      });
      expect(prisma.service.count).toHaveBeenCalledWith({ where: { active: true } });
    });

    it.each([
      ['ADMIN', admin],
      ['BARBER', barber],
    ])('%s lista todos os serviços, inclusive os desativados', async (_role, user) => {
      vi.mocked(prisma.service.findMany).mockResolvedValue([]);
      vi.mocked(prisma.service.count).mockResolvedValue(0);

      await service.findAll(user);

      expect(prisma.service.findMany).toHaveBeenCalledWith({ where: {}, skip: 0, take: 10 });
      expect(prisma.service.count).toHaveBeenCalledWith({ where: {} });
    });
  });

  describe('findOne', () => {
    it('deve retornar um serviço de acordo com id', async () => {
      vi.mocked(prisma.service.findFirst).mockResolvedValue({
        id: 'service-1', name: 'Corte maquina 0', price: 30, durationMinutes: 23,
      } as any);

      const result = await service.findOne(admin, 'service-1');

      expect(result).toEqual({
        id: 'service-1', name: 'Corte maquina 0', price: 30, durationMinutes: 23,
      });
      expect(prisma.service.findFirst).toHaveBeenCalledWith({ where: { id: 'service-1' } });
    });

    it('CLIENT só encontra o serviço se ele estiver ativo', async () => {
      vi.mocked(prisma.service.findFirst).mockResolvedValue({ id: 'service-1' } as any);

      await service.findOne(client, 'service-1');

      expect(prisma.service.findFirst).toHaveBeenCalledWith({
        where: { id: 'service-1', active: true },
      });
    });

    it('deve lançar NotFoundException se o serviço não existir (ou estiver desativado para o cliente)', async () => {
      vi.mocked(prisma.service.findFirst).mockResolvedValue(null);

      await expect(service.findOne(client, 'id-inexistente')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateService', () => {
    it('deve alterar um serviço de acordo com id', async () => {
      vi.mocked(prisma.service.findUnique).mockResolvedValue({
        id: 'service-1', name: 'Corte Americano', price: 20, durationMinutes: 40,
      } as any);

      vi.mocked(prisma.service.update).mockResolvedValue({
        id: 'service-1', name: 'Corte simples', price: 20, durationMinutes: 40,
      } as any);

      const result = await service.updateService('service-1', { name: 'Corte simples' });

      expect(result).toEqual({
        id: 'service-1',
        name: 'Corte simples',
        price: 20,
        durationMinutes: 40,
      });
      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: 'service-1' },
        data: { name: 'Corte simples' },
      });
    });

    it('deve desativar um serviço em vez de apagá-lo', async () => {
      vi.mocked(prisma.service.findUnique).mockResolvedValue({
        id: 'service-1', name: 'Corte Americano', active: true,
      } as any);

      vi.mocked(prisma.service.update).mockResolvedValue({
        id: 'service-1', name: 'Corte Americano', active: false,
      } as any);

      const result = await service.updateService('service-1', { active: false });

      expect(result).toEqual({ id: 'service-1', name: 'Corte Americano', active: false });
      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: 'service-1' },
        data: { active: false },
      });
    });

    it('deve lançar NotFoundException se o serviço não existir', async () => {
      vi.mocked(prisma.service.findUnique).mockResolvedValue(null);

      await expect(
        service.updateService('id-inexistente', { name: 'Corte simples' }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.service.update).not.toHaveBeenCalled();
    });
  });
});
