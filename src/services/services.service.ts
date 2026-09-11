import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateServiceDto } from './dto/createservice.dto.js';

@Injectable()
export class ServicesService {
    constructor(private prisma:PrismaService){}

    async createService(dto:CreateServiceDto){

        const findName = await this.prisma.service.findUnique({
            where:{name:dto.name}
        })

        if(findName){
            throw new ConflictException('Serviço ja cadastrado')
        }

        const create = await this.prisma.service.create({
            data:{
                name:dto.name,
                price:dto.price,
                durationMinutes:dto.durationMinutes
            }
        })

        return create
    }
}

    