import { IsUUID, IsDateString, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateAppointmentDto {
    // CLIENT: ignorado, o cliente é sempre quem está logado.
    // BARBER/ADMIN: obrigatório, é o cliente em nome de quem se agenda.
    @ApiPropertyOptional({
        example: '3f2c1a9e-7b1d-4c55-9a30-5d6e8f0a1b2c',
        description: 'Id do cliente. Ignorado se quem agenda é um `CLIENT` (vale o usuário logado); obrigatório para `BARBER` e `ADMIN`.',
    })
    @IsOptional()
    @IsUUID()
    clientId?: string

    @ApiProperty({ example: '8a1d4b7c-2e90-4f36-b5a1-7c3e9d2f6a40', description: 'Id do barbeiro (veja `GET /users`)' })
    @IsUUID()
    barberId:string

    @ApiProperty({ example: 'c5e7f3a2-9b84-4d1e-a6f0-2b8d4c6e1a93', description: 'Id do serviço (veja `GET /services`)' })
    @IsUUID()
    serviceId:string

    @ApiProperty({ example: '2026-10-20T14:00:00.000Z', description: 'Início do atendimento, em ISO 8601 (UTC)' })
    @IsDateString()
    scheduledAt:string

}
