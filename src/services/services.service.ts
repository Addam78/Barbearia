import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';
import type { AuthUser } from '../auth/decorators/current-user.decorator.js';

@Injectable()
export class ServicesService {
    constructor(private prisma:PrismaService){}

    // O cliente só enxerga serviços ativos; ADMIN e BARBER enxergam todos.
    private scopeFor(user: AuthUser) {
        return user.role === 'CLIENT' ? { active: true } : {}
    }

    async createService(dto:CreateServiceDto){

        const findName = await this.prisma.service.findUnique({
            where:{name:dto.name}
        })

        if (findName) {
            throw new ConflictException(
                findName.active === false
                    ? 'Serviço já cadastrado e está desativado. Reative-o em vez de criar outro.'
                    : 'Serviço ja cadastrado',
            )
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

    async findAll(user: AuthUser, page = 1, limit = 10) {
        const where = this.scopeFor(user)

        const [data, total] = await Promise.all([
            this.prisma.service.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.service.count({ where }),
        ])

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        }
    }

    async findOne(user: AuthUser, id:string){
        const result = await this.prisma.service.findFirst({
            where: { id, ...this.scopeFor(user) }
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
}
