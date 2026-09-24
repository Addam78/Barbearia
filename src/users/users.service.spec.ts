import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import { JwtService } from '@nestjs/jwt';


describe('UsersService', () => {
  let service: UsersService
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
             findMany: vi.fn(),
             findUnique: vi.fn(),
             update: vi.fn(),
             delete: vi.fn(),
             count: vi.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: { sign: vi.fn().mockReturnValue('fake-token') },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });


  describe('Retornar usuarios', () =>{
    it('Deve retornar todos usuarios cadastros no sistema',async () =>{
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {id:'user-1',name:'João', email:'joao@example.com',role:'CLIENT'}
      ]as any)
      vi.mocked(prisma.user.count).mockResolvedValue(1)

      const result = await service.findAll()

      expect(result).toEqual({
        data: [
          {id:'user-1', name:'João',email:'joao@example.com',role:'CLIENT'}
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      })
    })
  })


   describe('Retornar um usuario', () =>{
    it('Deve retornar um usuario com base no id', async() =>{
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        ({id:'user-1',name:'João', email:'joao@example.com',role:'CLIENT'}as any)
      )

      const result = await service.findOne('user-1')

      expect(result).toEqual(
        {id:'user-1', name:'João',email:'joao@example.com',role:'CLIENT'}
      )
    })

    it('Deve lançar NotFoundException se o usuario não existir', async() =>{
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      await expect(service.findOne('id-inexistente')).rejects.toThrow(
        NotFoundException,
      )
    })
   })


    describe('Editar um usuario', () =>{
    it('Deve ser possivel editar um usuario', async() =>{
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        ({id:'user-1',name:'João', email:'joao@example.com',role:'CLIENT'}as any)
      )

      vi.mocked(prisma.user.update).mockResolvedValue(
        ({id:'user-1',name:'Maicon', email:'joao@example.com',role:'CLIENT'}as any)
      )

      const result = await service.updateUser('user-1', {name:'Maicon'})

      expect(result).toEqual({
        id:'user-1',
        name:'Maicon',
        email:'joao@example.com',
        role:'CLIENT'
      })
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'Maicon' },
        select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
      });
    })
   })

   describe('Deletar usuario', () =>{
    it('Deve ser possivel deletar um usuario' , async() =>{
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        ({id:'user-1',name:'João', email:'joao@example.com',role:'CLIENT'}as any)
      )

      vi.mocked(prisma.user.delete).mockResolvedValue(
        ({id:'user-1',name:'João', email:'joao@example.com',role:'CLIENT'}as any)
      )

      const result = await service.deleteUser('user-1')

      expect(result).toEqual({
        id:'user-1', name:'João', email:'joao@example.com', role:'CLIENT'
      })
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
      });
    })

    it('Deve lançar NotFoundException se o usuario não existir', async() =>{
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      await expect(service.deleteUser('id-inexistente')).rejects.toThrow(
        NotFoundException,
      )

      expect(prisma.user.delete).not.toHaveBeenCalled()
    })
   })

})
