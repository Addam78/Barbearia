import { Body, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import {  UpdateUserDto } from './dto/update-user.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private prisma:PrismaService){}
  
  async findAll() {
      const result = await this.prisma.user.findMany({})
      
      return {result}
  }

  async findOne(id: string) {
    const result = await this.prisma.user.findUnique({
      where:{id}
    })

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
                  data:dto
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
      where: {id}
    })
  }
}
