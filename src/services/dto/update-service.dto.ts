import { CreateServiceDto } from "./create-service.dto.js";
import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class UpdateServiceDto extends PartialType(CreateServiceDto){
    @ApiPropertyOptional({
        example: false,
        description: 'Serviços não são apagados. Envie `false` para desativar (some para o cliente e não aceita novos agendamentos) e `true` para reativar.',
    })
    @IsOptional()
    @IsBoolean()
    active?: boolean
}
