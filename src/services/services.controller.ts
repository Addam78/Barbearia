import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ServicesService } from './services.service.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';


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

    @Get(':id')
    findOne(@Param('id') id:string){
        return this.servicesService.findOne(id)
    }
    
    @Patch(':id')
    updateService(@Param('id') id:string, @Body() dto:UpdateServiceDto){
        return this.servicesService.updateService(id,dto)
    }

    @Delete(':id')
    @HttpCode(204)
    deleteService(@Param('id')id:string){
        return this.servicesService.deleteService(id)
    }
}
