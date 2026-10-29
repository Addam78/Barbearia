import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from './auth/decorators/public.decorator.js';

// Usado pelo Render (healthCheckPath) para saber que a API subiu. Fica fora da documentação
// e não consulta o banco, para o health check não acordar nem sobrecarregar o Postgres.
@ApiExcludeController()
@SkipThrottle() // o Render chama esta rota o tempo todo; ela não pode ser barrada pelo limite
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: 'ok' };
  }
}
