import {IsNumber, IsString, Max, Min, } from  'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateServiceDto{
    @ApiProperty({ example: 'Corte simples', description: 'Nome do serviço (único)' })
    @IsString()
    name:string

    @ApiProperty({ example: 30, description: 'Preço em reais' })
    @IsNumber()
    price:number

    @ApiProperty({ example: 30, minimum: 1, maximum: 1440, description: 'Duração em minutos, de 1 a 1440 (usada para evitar horários sobrepostos)' })
    @IsNumber()
    @Min(1)
    @Max(1440)
    durationMinutes: number;


}
