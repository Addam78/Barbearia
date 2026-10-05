import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ServicesService } from './services.service.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthUser } from '../auth/decorators/current-user.decorator.js';


@ApiBearerAuth()
@Controller('services')
export class ServicesController {
    constructor(private readonly servicesService: ServicesService) {}

    @ApiOperation({
        summary: 'Criar serviço',
        description:
            'Cadastra um serviço da barbearia (corte, barba etc.) com nome, preço e duração em minutos. Só `ADMIN` ou `BARBER`. O nome é único: retorna 409 se já existir (inclusive se o serviço existente estiver desativado).',
    })
    @Roles('ADMIN', 'BARBER')
    @Post()
    create(@Body() dto:CreateServiceDto){
        return this.servicesService.createService(dto)
    }

    @ApiOperation({
        summary: 'Listar serviços',
        description:
            'Lista paginada de serviços (`?page=1&limit=10`). O `CLIENT` vê só os serviços **ativos**, que é o que ele usa para escolher ao agendar; `ADMIN` e `BARBER` veem todos, inclusive os desativados (campo `active`).',
    })
    @Get()
    findAll(@CurrentUser() user: AuthUser, @Query('page') page?:string, @Query('limit') limit?:string){
        return this.servicesService.findAll(user, Number(page) || 1,Number(limit) || 10)
    }

    @ApiOperation({
        summary: 'Buscar serviço por id',
        description: 'Qualquer usuário logado pode consultar. Para o `CLIENT`, um serviço desativado responde 404. Retorna 404 se o id não existir.',
    })
    @Get(':id')
    findOne(@CurrentUser() user: AuthUser, @Param('id') id:string){
        return this.servicesService.findOne(user, id)
    }

    @ApiOperation({
        summary: 'Editar ou desativar serviço',
        description:
            'Altera nome, preço, duração e/ou o campo `active`. Só `ADMIN` ou `BARBER`. **Serviços não são apagados, para manter o histórico dos agendamentos:** para tirá-lo de circulação, envie `{ "active": false }` (e `true` para reativar). Um serviço desativado some para o cliente e não aceita novos agendamentos, mas os agendamentos antigos continuam intactos. Retorna 404 se o id não existir.',
    })
    @Roles('ADMIN', 'BARBER')
    @Patch(':id')
    updateService(@Param('id') id:string, @Body() dto:UpdateServiceDto){
        return this.servicesService.updateService(id,dto)
    }
}
