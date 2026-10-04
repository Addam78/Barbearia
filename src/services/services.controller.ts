import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ServicesService } from './services.service.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';


@ApiBearerAuth()
@Controller('services')
export class ServicesController {
    constructor(private readonly servicesService: ServicesService) {}

    @ApiOperation({
        summary: 'Criar serviço',
        description:
            'Cadastra um serviço da barbearia (corte, barba etc.) com nome, preço e duração em minutos. Só `ADMIN` ou `BARBER`. O nome é único: retorna 409 se já existir.',
    })
    @Roles('ADMIN', 'BARBER')
    @Post()
    create(@Body() dto:CreateServiceDto){
        return this.servicesService.createService(dto)
    }

    @ApiOperation({
        summary: 'Listar serviços',
        description:
            'Lista paginada de serviços (`?page=1&limit=10`). Qualquer usuário logado pode consultar; é o que o cliente usa para escolher o serviço ao agendar.',
    })
    @Get()
    findAll(@Query('page') page?:string, @Query('limit') limit?:string){
        return this.servicesService.findAll(Number(page) || 1,Number(limit) || 10)
    }

    @ApiOperation({
        summary: 'Buscar serviço por id',
        description: 'Qualquer usuário logado pode consultar. Retorna 404 se o id não existir.',
    })
    @Get(':id')
    findOne(@Param('id') id:string){
        return this.servicesService.findOne(id)
    }

    @ApiOperation({
        summary: 'Editar serviço',
        description: 'Altera nome, preço e/ou duração. Só `ADMIN` ou `BARBER`. Retorna 404 se o id não existir.',
    })
    @Roles('ADMIN', 'BARBER')
    @Patch(':id')
    updateService(@Param('id') id:string, @Body() dto:UpdateServiceDto){
        return this.servicesService.updateService(id,dto)
    }

    @ApiOperation({
        summary: 'Remover serviço',
        description: 'Só `ADMIN` ou `BARBER`. Responde 204, sem corpo. Retorna 404 se o id não existir.',
    })
    @Roles('ADMIN', 'BARBER')
    @Delete(':id')
    @HttpCode(204)
    deleteService(@Param('id')id:string){
        return this.servicesService.deleteService(id)
    }
}
