import { IsEmail,IsString,MinLength,IsEnum } from "class-validator";
import { Role } from "../../generated/prisma/enums.js";

export class CreateUserDto {
    @IsString()
    name:string

    @IsEmail()
    email:string

    @IsString()
    @MinLength(6)
    password:string

    @IsEnum(Role)
    role:Role
}
