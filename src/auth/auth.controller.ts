import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { RegisterDto, } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { Public } from './decorators/public.decorator.js';
import { AcceptInviteDto } from './dto/accept-invite.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Cadastro de cliente',
    description:
      'O próprio usuário cria o seu acesso informando nome, e-mail e senha. Rota pública. A conta criada é sempre `CLIENT`, não dá para escolher o perfil. Barbeiros não usam esta rota: são criados pelo admin em `POST /users` e ativados por convite. Retorna 409 se o e-mail já estiver cadastrado.',
  })
  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({
    summary: 'Login',
    description:
      'Troca e-mail e senha por um `accessToken` (JWT, válido por 15min) e um `refreshToken` (válido por 7 dias). Use o `accessToken` no header `Authorization: Bearer <token>` das demais rotas. Quando ele expirar, troque o `refreshToken` por um par novo em `POST /auth/refresh`. Retorna 401 se as credenciais forem inválidas, ou se a conta ainda não teve o convite aceito.',
  })
  @Public()
  @HttpCode(200)
  @Post('login')
  login(@Body() dto:LoginDto){
    return this.authService.login(dto)
  }

  @ApiOperation({
    summary: 'Renovar access token',
    description:
      'Troca um `refreshToken` válido por um novo par (`accessToken` + `refreshToken`). O refresh token usado é revogado (rotação): não pode ser reaproveitado. Retorna 401 se o refresh token for inválido, expirado ou já revogado.',
  })
  @Public()
  @HttpCode(200)
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @ApiOperation({
    summary: 'Logout',
    description:
      'Revoga o `refreshToken` informado, impedindo que ele gere novos access tokens. O access token atual continua válido até expirar naturalmente (até 15min).',
  })
  @Public()
  @HttpCode(200)
  @Post('logout')
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto);
  }

  @ApiOperation({
    summary: 'Aceitar convite e definir senha',
    description:
      'Usada por quem foi criado pelo admin (por exemplo, um barbeiro). Envie o `token` do convite, recebido por e-mail, e a senha escolhida. Cada convite só pode ser usado uma vez; depois disso, o login funciona normalmente em `POST /auth/login`. Retorna 401 se o token for inválido ou já tiver sido usado.',
  })
  @Public()
  @Post('accept-invite')
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.authService.acceptInvite(dto);
  }


}
