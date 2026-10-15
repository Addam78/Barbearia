import { Body, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import {  UpdateUserDto } from './dto/update-user.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';

@Injectable()
export class UsersService {

  constructor(private prisma:PrismaService, private notifications : NotificationsService){}
  

  private readonly publicFields = {
    id: true,
    name: true,
    email: true,
    role: true,
    createdAt: true,
    updatedAt: true,
  }

  
  async create (dto:CreateUserDto){
    const searchUser = await this.prisma.user.findUnique({
      where : {email: dto.email}
    })

    if (searchUser) {
      throw new ConflictException('Email existente')
    }

    const hashedPassword = await bcrypt.hash(randomBytes(32).toString('hex'), 8)

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: dto.role,
      },
      select: this.publicFields,
    })

    this.notifications.publishUserCreated({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      needsInvite: true,
    })

    return user
  }


  async findAll(currentUser: AuthUser, page = 1, limit = 10, role?: string) {
      const isClient = currentUser.role === 'CLIENT'

      // CLIENT só pode listar barbeiros (pra escolher um ao agendar), e só com nome/id.
      if (isClient && role !== Role.BARBER) {
        throw new ForbiddenException('Você só pode listar barbeiros')
      }

      const where = role ? { role: role as Role } : {}
      const select = isClient ? { id: true, name: true } : this.publicFields

      const [data, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          select,
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.user.count({ where }),
      ])

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
  }


  
  async findOne(id: string) {
    const result = await this.prisma.user.findUnique({
      where:{id},
      select: this.publicFields,
    })

    if(!result){
      throw new NotFoundException('Usuario com id informado não encontrado')
    }

    return result
  }

  async updateUser(id:string, dto:UpdateUserDto) {
       const result = await this.prisma.user.findUnique ({
                  where : {id}
              })
              if(!result){
                  throw new NotFoundException('Usuario não encontrado')
              }

              return this.prisma.user.update({
                  where:{id},
                  data:dto,
                  select: this.publicFields,
              })
  }

  async deleteUser(id: string) {
    const result = await this.prisma.user.findUnique({
      where:{id}
    })

    if(!result){
      throw new NotFoundException('Usuario com id informado não encontrado')
    }

    return this.prisma.user.delete({
      where: {id},
      select: this.publicFields,
    })
  }
}
