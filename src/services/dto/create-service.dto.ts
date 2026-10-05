import {IsNumber, IsString, Min, } from  'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateServiceDto{
    @ApiProperty({ example: 'Corte simples', description: 'Nome do serviço (único)' })
    @IsString()
    name:string

    @ApiProperty({ example: 30, description: 'Preço em reais' })
    @IsNumber()
    price:number

    @ApiProperty({ example: 30, minimum: 1, description: 'Duração em minutos (usada para evitar horários sobrepostos)' })
    @IsNumber()
    @Min(1)
    durationMinutes: number;


}
