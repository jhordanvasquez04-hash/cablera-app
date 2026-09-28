import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "crypto";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { UsuariosService } from "../usuarios/usuarios.service";
import { LoginThrottle } from "./login-throttle";
import { mensajeEmpresaBloqueada } from "./mensaje-empresa-bloqueada.util";
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
    private prisma: PrismaService,
  ) {}

  async login(dto: LoginDto, ip: string, dispositivo?: string) {
    const email = dto.email.trim().toLowerCase();
    this.throttle.verificar(ip, email);

    const usuario = await this.usuariosService.findByEmail(email);
    const passwordValida = await bcrypt.compare(dto.password, usuario?.passwordHash ?? HASH_RELLENO);
    if (!usuario || !passwordValida) {
      this.throttle.registrarFallo(ip, email);
      throw new UnauthorizedException("Credenciales inválidas");
    }

    // super_admin no tiene empresa (usuario.empresa es null) y por lo tanto nunca se bloquea acá.
    // `!== "activa"` (no solo `=== "suspendida"`) para que "morosa" (fusión con Keysls: sin
    // pago de suscripción del mes) bloquee igual, sin tener que acordarse de este chequeo cada
    // vez que se agregue un estado nuevo.
    if (usuario.empresa && usuario.empresa.estado !== "activa") {
      throw new UnauthorizedException(mensajeEmpresaBloqueada(usuario.empresa.estado));
    }

    if (!usuario.activo) {
      throw new UnauthorizedException("Esta cuenta fue desactivada. Contacta a tu gestor.");
    }

    this.throttle.registrarExito(ip, email);
    // jti aleatorio: sin esto, dos logins de la MISMA cuenta dentro del mismo segundo (iat
    // igual, resto del payload idéntico) firman el EXACTO mismo JWT — y como TokenSesion.token
    // es único, el segundo login reventaría con un 409 en vez de darte una sesión nueva.
    const payload = { sub: usuario.id, email: usuario.email, rol: usuario.rol, empresaId: usuario.empresaId, jti: randomUUID() };
    const accessToken = await this.jwtService.signAsync(payload);

    // Fusión con Keysls: sesión respaldada en BD (TokenSesion), no una caché en memoria — así
    // desactivar una cuenta o cerrar sesión corta el acceso al instante (sin esperar hasta 30s
    // como antes) y sobrevive a un reinicio o a correr varias réplicas del backend. Ver
    // jwt.strategy.ts (valida contra esta tabla) y auth.controller.ts (logout la borra).
    const { exp } = this.jwtService.decode(accessToken) as { exp: number };
    await this.prisma.tokenSesion.create({
      data: { usuarioId: usuario.id, token: accessToken, dispositivo: dispositivo?.slice(0, 255) || null, expiresAt: new Date(exp * 1000) },
    });

    return {
      accessToken,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    };
  }

  async logout(token: string) {
    // delete (no deleteMany) sería más estricto, pero el token ya podría no existir (doble
    // logout, o ya vencido y barrido por la limpieza programada) — deleteMany no revienta en ese caso.
    await this.prisma.tokenSesion.deleteMany({ where: { token } });
    return { ok: true };
  }
}
