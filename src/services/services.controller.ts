import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
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
    findAll(@Query('page') page?:string, @Query('limit') limit?:string){
        return this.servicesService.findAll(Number(page) || 1,Number(limit) || 10)
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
