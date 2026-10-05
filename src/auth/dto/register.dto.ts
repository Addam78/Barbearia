import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'João Silva', description: 'Nome do cliente' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'joao@email.com', description: 'E-mail usado para o login (único)' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senha123', minLength: 6, description: 'Mínimo de 6 caracteres' })
  @IsString()
  @MinLength(6)
  password: string;
}
