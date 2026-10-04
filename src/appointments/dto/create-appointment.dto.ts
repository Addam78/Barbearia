import { IsUUID, IsDateString, IsOptional } from 'class-validator'

export class CreateAppointmentDto {
    // CLIENT: ignorado, o cliente é sempre quem está logado.
    // BARBER/ADMIN: obrigatório, é o cliente em nome de quem se agenda.
    @IsOptional()
    @IsUUID()
    clientId?: string

    @IsUUID()
    barberId:string

    @IsUUID()
    serviceId:string

    @IsDateString()
    scheduledAt:string

}
