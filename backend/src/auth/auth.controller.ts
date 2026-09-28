import { Body, Controller, Headers, Ip, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { TecnicoAuthService } from "./tecnico-auth.service";
import { LoginDto } from "./dto/login.dto";
import { Public } from "./decorators/public.decorator";
import { Roles } from "./decorators/roles.decorator";

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private tecnicoAuthService: TecnicoAuthService,
  ) {}

  @Public()
  @Post("login")
  login(@Body() dto: LoginDto, @Ip() ip: string, @Headers("user-agent") userAgent?: string) {
    return this.authService.login(dto, ip, userAgent);
  }

  // Cualquier rol (incluido super_admin) puede cerrar SU propia sesión — no es una acción de
  // negocio de un tenant, así que se listan los tres a propósito (ver el comentario del default
  // en roles.guard.ts: sin @Roles(), super_admin quedaría afuera).
  @Roles("gestor", "cobrador", "super_admin")
  @Post("logout")
  logout(@Headers("authorization") authorization?: string) {
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    return this.authService.logout(token);
  }

  // Portal de campo: mismo shape de credenciales, pero autentica contra Tecnico, no Usuario
  // (ver el comentario en tecnico-auth.guard.ts).
  @Public()
  @Post("tecnico/login")
  loginTecnico(@Body() dto: LoginDto, @Ip() ip: string) {
    return this.tecnicoAuthService.login(dto, ip);
  }
}
