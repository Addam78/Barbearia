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
    const prismaMock: any = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      inviteToken: {
        findUnique: vi.fn(),
        updateMany: vi.fn(),
      },
    };
    prismaMock.$transaction = vi.fn((callback) => callback(prismaMock));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
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

  describe('acceptInvite', () => {
    it('deve definir a senha e marcar o convite como USED', async () => {
      vi.mocked(prisma.inviteToken.findUnique).mockResolvedValue({
        id: 'invite-1',
        userId: 'user-1',
        token: 'token-valido',
        status: 'PENDING',
      } as any);
      vi.mocked(prisma.inviteToken.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(bcrypt.hash).mockResolvedValue('hash-novo' as never);

      const result = await service.acceptInvite({
        token: 'token-valido',
        password: 'novaSenha123',
      });

      expect(result).toEqual({ message: 'Senha definida com sucesso' });
      expect(prisma.inviteToken.updateMany).toHaveBeenCalledWith({
        where: { id: 'invite-1', status: 'PENDING' },
        data: { status: 'USED' },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { password: 'hash-novo' },
      });
    });

    it('deve lançar UnauthorizedException se o token não existir', async () => {
      vi.mocked(prisma.inviteToken.findUnique).mockResolvedValue(null);

      await expect(
        service.acceptInvite({ token: 'token-inexistente', password: 'novaSenha123' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('deve lançar UnauthorizedException se o convite já foi usado', async () => {
      vi.mocked(prisma.inviteToken.findUnique).mockResolvedValue({
        id: 'invite-1',
        userId: 'user-1',
        token: 'token-usado',
        status: 'USED',
      } as any);

      await expect(
        service.acceptInvite({ token: 'token-usado', password: 'novaSenha123' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('não troca a senha se outra requisição já usou o convite (corrida)', async () => {
      vi.mocked(prisma.inviteToken.findUnique).mockResolvedValue({
        id: 'invite-1',
        userId: 'user-1',
        token: 'token-valido',
        status: 'PENDING',
      } as any);
      // outra requisição marcou como USED entre a leitura e a gravação
      vi.mocked(prisma.inviteToken.updateMany).mockResolvedValue({ count: 0 });
      vi.mocked(bcrypt.hash).mockResolvedValue('hash-novo' as never);

      await expect(
        service.acceptInvite({ token: 'token-valido', password: 'novaSenha123' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  })


});



