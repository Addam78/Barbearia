import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptInviteDto {
  @ApiProperty({
    example: 'e3b0c442-98fc-4c14-9afb-f4c8996fb924',
    description: 'Token do convite: o valor que vem depois de `token=` no link do e-mail',
  })
  @IsString()
  token: string;

  @ApiProperty({ example: 'minhaSenha123', minLength: 6, description: 'Senha que você quer usar no login' })
  @IsString()
  @MinLength(6)
  password: string;
}
