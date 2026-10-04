import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AcceptInviteDto } from './dto/accept-invite.dto.js';


@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
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

    const accessToken = this.jwtService.sign({sub:user.id,role:user.role})

    return {accessToken}

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
