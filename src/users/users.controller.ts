import { Controller, Get, Post, Body, Patch, Param, Delete, Query, NotFoundException } from '@nestjs/common';
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
      'Lista paginada de usuários (`?page=1&limit=10`). `ADMIN` e `BARBER` veem todos, com todos os campos (menos senha). `CLIENT` só pode chamar com `?role=BARBER` (pra escolher um barbeiro ao agendar) e recebe só `id` e `name`; qualquer outro uso retorna 403.',
  })
  @Get()
  findAll(
    @CurrentUser() currentUser: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
  ) {
    return this.usersService.findAll(currentUser, Number(page) || 1, Number(limit) || 10, role);
  }

  @ApiOperation({
    summary: 'Buscar usuário por id',
    description:
      '`ADMIN` e `BARBER` consultam qualquer usuário; o `CLIENT` só consulta a própria conta. Retorna 404 se o id não existir **ou** não for o seu (para não revelar que o id existe).',
  })
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() currentUser: AuthUser) {
    if (currentUser.role === 'CLIENT' && currentUser.userId !== id) {
      throw new NotFoundException('Usuario com id informado não encontrado');
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
      'Altera nome e/ou e-mail. O `ADMIN` pode editar qualquer conta; os demais perfis só a própria. Retorna 404 se o id não existir **ou** não for o seu.',
  })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: { userId: string; role: string },
  ) {
    if (currentUser.role !== 'ADMIN' && currentUser.userId !== id) {
      throw new NotFoundException('Usuario com id informado não encontrado');
    }
    return this.usersService.updateUser(id, updateUserDto);
  }

  @ApiOperation({
    summary: 'Remover usuário',
    description:
      'O `ADMIN` pode remover qualquer conta; os demais perfis só a própria. Retorna 404 se o id não existir **ou** não for o seu.',
  })
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() currentUser: { userId: string; role: string }) {
    if (currentUser.role !== 'ADMIN' && currentUser.userId !== id) {
      throw new NotFoundException('Usuario com id informado não encontrado');
    }
    return this.usersService.deleteUser(id);
  }
}
