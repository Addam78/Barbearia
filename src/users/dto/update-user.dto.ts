import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
    @ApiPropertyOptional({ example: 'Carlos Souza' })
    @IsString()
    @IsOptional()
    name?:string

    @ApiPropertyOptional({ example: 'carlos.souza@barbearia.com' })
    @IsString()
    @IsOptional()
    email?:string
}
