import { IsEmail,IsString,IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Role } from "../../generated/prisma/enums.js";

export class CreateUserDto {
    @ApiProperty({ example: 'Carlos Barbeiro', description: 'Nome de quem vai receber o convite' })
    @IsString()
    name:string

    @ApiProperty({ example: 'carlos@barbearia.com', description: 'E-mail que recebe o convite (único)' })
    @IsEmail()
    email:string

    @ApiProperty({ enum: Role, example: 'BARBER', description: 'Perfil da conta. Para criar um barbeiro, use `BARBER`.' })
    @IsEnum(Role)
    role:Role
}
