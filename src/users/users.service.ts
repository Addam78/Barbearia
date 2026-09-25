import { Body, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import {  UpdateUserDto } from './dto/update-user.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {

  constructor(private prisma:PrismaService){}
  

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

    if(searchUser){
      throw new ConflictException('Email existente')
    }

    const hashedPassword = await bcrypt.hash(dto.password,8)

    return this.prisma.user.create({
      data:{
        name:dto.name,
        email:dto.email,
        password: hashedPassword,
        role: dto.role
      },
      select: this.publicFields,
    })
  }


  async findAll(page = 1, limit = 10) {
      const [data, total] = await Promise.all([
        this.prisma.user.findMany({
          select: this.publicFields,
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.user.count(),
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
