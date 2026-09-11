import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';

import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { access } from 'fs';
import * as bcrypt from 'bcryptjs';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
vi.mock('bcryptjs')




describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: vi.fn(),
              create: vi.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: { sign: vi.fn().mockReturnValue('fake-token') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });



  describe('register', () => {
    it('deve criar um usuário ', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'user-1',
        name: 'João',
        email: 'joao@example.com',
        password: 'hash-qualquer',
        role: 'CLIENT',
      } as any);

      const result = await service.register({
        name: 'João',
        email: 'joao@example.com',
        password: '123456',
        role: 'CLIENT',
      } as any);

      expect(result).toEqual({ id: 'user-1', name: 'João', email: 'joao@example.com' });
      
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('deve lançar ConflictException se o email já existir', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'joao@example.com' } as any);

      await expect(
        service.register({
          name: 'João',
          email: 'joao@example.com',
          password: '123456',
          role: 'CLIENT',
        } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () =>{
    it('login com sucesso' ,async ()=>{
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id:'user-1',
        name:'João',
        email:'joao@exemplo.com',
        password : 'hash-qualquer',
        role: 'CLIENT',
      }as any)

      vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

      const result = await service.login({
        email: 'joao@example.com',
        password:'123456',
      } as any )
      
      expect(result).toEqual({accessToken:'fake-token'})
    })

    it('deve lançar UnauthorizedException se o usuário não existir' ,async()=>{
     vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
        await expect(
          service.login({
             email: 'naoexiste@example.com',
             password: '123456',
          } as any),
        ).rejects.toThrow(UnauthorizedException)
    })

    
    it('Deve lançar erro se as senhas forem divergentes', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'joao@example.com',
        password: 'hash-qualquer',
      } as any);

      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        service.login({
          email: 'joao@example.com',
          password: 'senha-errada',
        } as any),
      ).rejects.toThrow(UnauthorizedException);
    })
  })
  
  
});



