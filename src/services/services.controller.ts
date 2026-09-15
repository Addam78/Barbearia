import { Body, Controller, Get, Post } from '@nestjs/common';
import { ServicesService } from './services.service.js';
import { CreateServiceDto } from './dto/createservice.dto.js';

@Controller('services')
export class ServicesController {
    constructor(private readonly servicesService: ServicesService) {}

    @Post()
    create(@Body() dto:CreateServiceDto){
        return this.servicesService.createService(dto)
    }

    @Get()
    findAll(){
        return this.servicesService.findAll()
    }
}
