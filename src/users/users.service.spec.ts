import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from '../notifications/notifications.service.js';
import { Prisma } from '../generated/prisma/client.js';



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
             create: vi.fn(),
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
        {
          provide: NotificationsService,
          useValue: { publishUserCreated: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Criar usuario com permissão de admin', ()=>{
    it('Deve ser possivel criar ususrio com role BARBER' ,async() =>{
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'user-1',
        name: 'João',
        email: 'joao@example.com',
        role: 'BARBER',
      } as any)

      const result = await service.create({
        name:'João',
        email:'joao@example.com',
        password:'123456',
        role:'BARBER'
      }as any )

      expect(result).toEqual({
        id: 'user-1',
        name: 'João',
        email: 'joao@example.com',
        role: 'BARBER',
      })


    })
  })

  describe ('Deve lançar ConflictException se o email ja existir' ,()=>{
    it('Deve ser possivel criar usuarios com role BARBER' ,async() =>{
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        ({id:'user-1',name:'João', email:'joao@example.com',role:'BARBER'} as any)
      )

      await expect(
        service.create({
           name: 'João',
        email: 'joao@example.com',
        password: '123456',
        role: 'BARBER',
        } as any),
      ).rejects.toThrow(ConflictException)


      
    })
  })



  describe('Retornar usuarios', () =>{
    it('Deve retornar todos usuarios cadastros no sistema',async () =>{
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {id:'user-1',name:'João', email:'joao@example.com',role:'CLIENT'}
      ]as any)
      vi.mocked(prisma.user.count).mockResolvedValue(1)

      const result = await service.findAll({ userId: 'admin-1', role: 'ADMIN' } as any)

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

    it('CLIENT só pode listar com ?role=BARBER, e só recebe id/name', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: 'barber-1', name: 'Carlos' },
      ] as any)
      vi.mocked(prisma.user.count).mockResolvedValue(1)

      const result = await service.findAll({ userId: 'client-1', role: 'CLIENT' } as any, 1, 10, 'BARBER')

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { role: 'BARBER' },
        select: { id: true, name: true },
        skip: 0,
        take: 10,
      })
      expect(result.data).toEqual([{ id: 'barber-1', name: 'Carlos' }])
    })

    it('CLIENT recebe 403 ao tentar listar sem ?role=BARBER', async () => {
      await expect(
        service.findAll({ userId: 'client-1', role: 'CLIENT' } as any),
      ).rejects.toThrow(ForbiddenException)
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

    it('Deve lançar ConflictException se o usuario ainda tiver agendamentos (P2003)', async() =>{
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        ({id:'user-1',name:'João', email:'joao@example.com',role:'CLIENT'}as any)
      )
      vi.mocked(prisma.user.delete).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('fk', { code: 'P2003', clientVersion: 'test' }),
      )

      await expect(service.deleteUser('user-1')).rejects.toThrow(ConflictException)
    })

    it('Repassa qualquer outro erro do banco ao deletar', async() =>{
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        ({id:'user-1',name:'João', email:'joao@example.com',role:'CLIENT'}as any)
      )
      const error = new Error('banco fora do ar')
      vi.mocked(prisma.user.delete).mockRejectedValue(error)

      await expect(service.deleteUser('user-1')).rejects.toBe(error)
    })
   })

})
