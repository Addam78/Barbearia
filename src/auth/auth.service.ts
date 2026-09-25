import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';


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
}
