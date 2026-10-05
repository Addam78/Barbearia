import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthUser } from '../auth/decorators/current-user.decorator.js';

@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}


  @ApiOperation({
    summary: 'Listar usuários',
    description:
      'Lista paginada de usuários (`?page=1&limit=10`). Só `ADMIN` e `BARBER`: o `CLIENT` recebe 403. A senha nunca é retornada.',
  })
  @Roles('ADMIN', 'BARBER')
  @Get()
  findAll(@Query('page') page?:string, @Query('limit') limit?:string) {
    return this.usersService.findAll(Number(page) || 1, Number(limit) || 10);
  }

  @ApiOperation({
    summary: 'Buscar usuário por id',
    description:
      '`ADMIN` e `BARBER` consultam qualquer usuário; o `CLIENT` só consulta a própria conta (nos demais ids recebe 403). Retorna 404 se o id não existir.',
  })
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() currentUser: AuthUser) {
    if (currentUser.role === 'CLIENT' && currentUser.userId !== id) {
      throw new ForbiddenException('Você só pode consultar a própria conta');
    }
    return this.usersService.findOne(id);
  }


  @ApiOperation({
    summary: 'Criar usuário por convite (admin)',
    description:
      'Só `ADMIN`. É assim que se cria um barbeiro: o admin informa nome, e-mail e perfil, **sem senha**. A conta nasce sem acesso e a pessoa recebe um e-mail de convite; ela define a própria senha em `POST /auth/accept-invite`. Para o cliente criar o próprio acesso, use `POST /auth/register`. Retorna 409 se o e-mail já existir.',
  })
  @Roles('ADMIN')
  @Post()
  create(@Body() dto:CreateUserDto ){
    return this.usersService.create(dto)
  }

  @ApiOperation({
    summary: 'Editar usuário',
    description:
      'Altera nome e/ou e-mail. O `ADMIN` pode editar qualquer conta; os demais perfis só a própria (senão retorna 403).',
  })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: { userId: string; role: string },
  ) {
    if (currentUser.role !== 'ADMIN' && currentUser.userId !== id) {
      throw new ForbiddenException('Você só pode editar a própria conta');
    }
    return this.usersService.updateUser(id, updateUserDto);
  }

  @ApiOperation({
    summary: 'Remover usuário',
    description:
      'O `ADMIN` pode remover qualquer conta; os demais perfis só a própria (senão retorna 403).',
  })
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() currentUser: { userId: string; role: string }) {
    if (currentUser.role !== 'ADMIN' && currentUser.userId !== id) {
      throw new ForbiddenException('Você só pode remover a própria conta');
    }
    return this.usersService.deleteUser(id);
  }
}
