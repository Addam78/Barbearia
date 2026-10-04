import { IsEmail,IsString,IsEnum } from "class-validator";
import { Role } from "../../generated/prisma/enums.js";

export class CreateUserDto {
    @IsString()
    name:string

    @IsEmail()
    email:string

    @IsEnum(Role)
    role:Role
}
