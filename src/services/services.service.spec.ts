import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { ServicesService } from './services.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('ServicesService', () => {
  let service: ServicesService;
  let prisma: PrismaService;

    beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        {
          provide: PrismaService,
          useValue: {
            service: {
              findUnique: vi.fn(),
              create: vi.fn(),
              findMany: vi.fn(),
              update: vi.fn(),
              delete: vi.fn(),
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
  });

      it('deve lançar ConflictException se o nome já existir', async () => {
      vi.mocked(prisma.service.findUnique).mockResolvedValue({
        id: 'service-1',
        name: 'Corte americano',
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


      describe('findAll', () => {
    it('deve retornar a lista de serviços', async () => {
      vi.mocked(prisma.service.findMany).mockResolvedValue([
        { id: 'service-1', name: 'Corte americano', price: 20, durationMinutes: 40 },
      ] as any);

      const result = await service.findAll();

      expect(result).toEqual({
        searchServices: [
          { id: 'service-1', name: 'Corte americano', price: 20, durationMinutes: 40 },
        ],
      });
    });
  });

  describe('updateService' ,() =>{
    it('deve alterar um serviço de acordo com id',async()=>{
      vi.mocked(prisma.service.findUnique).mockResolvedValue({
        id:'service-1',name:'Corte Americano',price:20, durationMinutes:40,
      } as any)
      
      vi.mocked(prisma.service.update).mockResolvedValue({
         id: 'service-1', name: 'Corte simples', price: 20, durationMinutes: 40 ,
    }as any)

      const result = await service.updateService('service-1', {name:'Corte simples'})

      expect(result).toEqual({
        id:'service-1',
        name:'Corte simples',
        price:20,
        durationMinutes:40
      })
      expect(prisma.service.update).toHaveBeenCalledWith({
      where: { id: 'service-1' },
      data: { name: 'Corte simples' },
    });

    })
  })

  describe('deleteService', () => {
    it('deve remover um serviço de acordo com id', async () => {
      vi.mocked(prisma.service.findUnique).mockResolvedValue({
        id: 'service-1', name: 'Corte Americano', price: 20, durationMinutes: 40,
      } as any);

      vi.mocked(prisma.service.delete).mockResolvedValue({
        id: 'service-1', name: 'Corte Americano', price: 20, durationMinutes: 40,
      } as any);

      const result = await service.deleteService('service-1');

      expect(result).toEqual({
        id: 'service-1', name: 'Corte Americano', price: 20, durationMinutes: 40,
      });
      expect(prisma.service.delete).toHaveBeenCalledWith({
        where: { id: 'service-1' },
      });
    });

    it('deve lançar NotFoundException se o serviço não existir', async () => {
      vi.mocked(prisma.service.findUnique).mockResolvedValue(null);

      await expect(service.deleteService('id-inexistente')).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.service.delete).not.toHaveBeenCalled();
    });
  });

});