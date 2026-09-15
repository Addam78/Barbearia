import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateServiceDto } from './dto/createservice.dto.js';
import { UpdateServiceDto } from './dto/updateservice.dto.js';

@Injectable()
export class ServicesService {
    constructor(private prisma:PrismaService){}

    async createService(dto:CreateServiceDto){

        const findName = await this.prisma.service.findUnique({
            where:{name:dto.name}
        })

        if (findName) {
            throw new ConflictException('Serviço ja cadastrado')
        }

        const create = await this.prisma.service.create({
            data: {
                name: dto.name,
                price: dto.price,
                durationMinutes: dto.durationMinutes
            }
        })

        return create
        
    }

    async findAll(){

        const searchServices = await this.prisma.service.findMany ({
            
        })
        
        return {searchServices}
      
    }

    async updateService(id:string, dto:UpdateServiceDto){
        const service = await this.prisma.service.findUnique ({
            where : {id}
        })
        if(!service){
            throw new NotFoundException('Serviço não encontrado')
        }

        return this.prisma.service.update({
            where:{id},
            data:dto
        })
    } 
    
    async deleteService(id:string){
        const service = await this.prisma.service.findUnique({
            where : {id}
        })

        if(!service){
            throw new NotFoundException('Serviço não existente')
        }

        return this.prisma.service.delete({
            where : {id}
        })

        
    }
}

    