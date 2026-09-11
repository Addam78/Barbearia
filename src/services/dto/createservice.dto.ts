import {IsBoolean, IsNumber, IsString, Min, } from  'class-validator'

export class CreateServiceDto{
    @IsString()
    name:string

    @IsNumber()
    price:number
    
    @IsNumber()
    @Min(1)
    durationMinutes: number;


}