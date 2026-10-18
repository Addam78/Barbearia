import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from './auth/decorators/public.decorator.js';

// Usado pelo Render (healthCheckPath) para saber que a API subiu. Fica fora da documentação
// e não consulta o banco, para o health check não acordar nem sobrecarregar o Postgres.
@ApiExcludeController()
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: 'ok' };
  }
}
