import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';

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

    async findAll(page = 1, limit = 10) {
        const [data, total] = await Promise.all([
            this.prisma.service.findMany({
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.service.count(),
        ])

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        }
    }

    async findOne(id:string){
        const result = await this.prisma.service.findUnique({
            where :{id}
        })

        if(!result){
            throw new NotFoundException('Serviço com id não encontrado')
        }

        return result
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

    