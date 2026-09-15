import { CreateServiceDto } from "./createservice.dto.js";
import { PartialType } from "@nestjs/mapped-types";

export class UpdateServiceDto extends PartialType(CreateServiceDto){}