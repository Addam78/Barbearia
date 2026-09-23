import { IsUUID,IsDateString} from 'class-validator'

export class CreateAppointmentDto {
    @IsUUID()
    clientId:string

    @IsUUID()
    barberId:string

    @IsUUID()
    serviceId:string

    @IsDateString()
    scheduledAt:string

}
