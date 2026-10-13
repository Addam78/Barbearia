import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AcceptInviteDto } from './dto/accept-invite.dto.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { randomBytes, createHash } from 'crypto';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private notifications:NotificationsService
  ){} 


  async register (dto:RegisterDto){
    const userExists = await this.prisma.user.findUnique({
        where:{email:dto.email}
    })

    if(userExists){
        throw new ConflictException ('Email ja cadastrado')
    }

    const hashedPassword = await bcrypt.hash(dto.password,8)

    const user = await this.prisma.user.create ({
         data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role : 'CLIENT'
      } 
    })

    this.notifications.publishUserCreated({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      needsInvite: false,
    })

    return { id: user.id, name: user.name, email: user.email }
  }


  async login(dto:LoginDto){
    const user = await this.prisma.user.findUnique({
      where : {email:dto.email}
    })

    if(!user){
      throw new UnauthorizedException('Credencias invalidas ')
    }

    const passwordMatches = await bcrypt.compare(dto.password,user.password)

    if(!passwordMatches){
      throw new UnauthorizedException('Credenciais invalidas')
    }

    return this.generateTokens(user.id, user.role)


  }


    private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async generateTokens(userId: string, role: string) {
    const accessToken = this.jwtService.sign({ sub: userId, role });

    const refreshToken = randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hashToken(refreshToken),
        userId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

    async refresh(dto: RefreshTokenDto) {
    const tokenHash = this.hashToken(dto.refreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
    });

    if (!user) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    // Rotação: revoga o token usado e emite um par novo.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(user.id, user.role);
  }

  async logout(dto: RefreshTokenDto) {
    const tokenHash = this.hashToken(dto.refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Logout realizado com sucesso' };
  }
  
  async acceptInvite(dto: AcceptInviteDto) {
  const invite = await this.prisma.inviteToken.findUnique({
    where: { token: dto.token },
  });

  if (!invite || invite.status !== 'PENDING') {
    throw new UnauthorizedException('Convite inválido ou já utilizado');
  }

  const hashedPassword = await bcrypt.hash(dto.password, 8);

  await this.prisma.$transaction(async (tx) => {
    // "Reserva" o convite: só uma requisição consegue passar de PENDING para USED,
    // mesmo se duas chegarem ao mesmo tempo com o mesmo token.
    const claimed = await tx.inviteToken.updateMany({
      where: { id: invite.id, status: 'PENDING' },
      data: { status: 'USED' },
    });

    if (claimed.count !== 1) {
      throw new UnauthorizedException('Convite inválido ou já utilizado');
    }

    await tx.user.update({
      where: { id: invite.userId },
      data: { password: hashedPassword },
    });
  });

  return { message: 'Senha definida com sucesso' };
}
}
