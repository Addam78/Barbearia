import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto.js';
import { IsString, IsOptional, IsEmail } from 'class-validator';

export class UpdateUserDto {
    @IsString()
    @IsOptional()
    name?:string

    @IsString()
    @IsOptional()
    email?:string
}