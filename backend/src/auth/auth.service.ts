import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { UsuariosService } from "../usuarios/usuarios.service";
import { LoginThrottle } from "./login-throttle";
import type { LoginDto } from "./dto/login.dto";

// Hash de relleno: cuando el correo no existe se compara igual contra un hash real, para que
// responder "credenciales inválidas" tarde lo mismo exista o no la cuenta (evita enumerar usuarios).
const HASH_RELLENO = bcrypt.hashSync("relleno-sin-cuenta", 10);

@Injectable()
export class AuthService {
  constructor(
    private usuariosService: UsuariosService,
    private jwtService: JwtService,
    private throttle: LoginThrottle,
  ) {}

  async login(dto: LoginDto, ip: string) {
    const email = dto.email.trim().toLowerCase();
    this.throttle.verificar(ip, email);

    const usuario = await this.usuariosService.findByEmail(email);
    const passwordValida = await bcrypt.compare(dto.password, usuario?.passwordHash ?? HASH_RELLENO);
    if (!usuario || !passwordValida) {
      this.throttle.registrarFallo(ip, email);
      throw new UnauthorizedException("Credenciales inválidas");
    }

    // super_admin no tiene empresa (usuario.empresa es null) y por lo tanto nunca se bloquea acá.
    if (usuario.empresa?.estado === "suspendida") {
      throw new UnauthorizedException("Esta empresa está suspendida. Contacta al administrador.");
    }

    this.throttle.registrarExito(ip, email);
    const payload = { sub: usuario.id, email: usuario.email, rol: usuario.rol, empresaId: usuario.empresaId };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    };
  }
}
