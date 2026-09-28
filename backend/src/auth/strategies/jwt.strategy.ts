import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthenticatedUser } from "../decorators/current-user.decorator";

interface JwtPayload {
  sub: string;
  email: string;
  rol: AuthenticatedUser["rol"];
  empresaId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("JWT_SECRET"),
      // Necesita el token crudo (no solo el payload decodificado) para buscarlo en
      // TokenSesion — ver el comentario abajo.
      passReqToCallback: true,
    });
  }

  /**
   * Fusión con Keysls: valida contra TokenSesion (BD), no contra una caché en memoria con
   * ventana de 30s como antes. Dos motivos por los que es mejor:
   * 1. Instantáneo — desactivar la cuenta, suspender la empresa, o cerrar sesión (logout)
   *    cortan el acceso en la SIGUIENTE petición, no "hasta 30 segundos después".
   * 2. Sobrevive un reinicio del backend y funciona igual con varias réplicas corriendo
   *    detrás de un load balancer (una caché en memoria de una instancia no la ven las demás).
   * El costo es una consulta a la BD por request en vez de cada ~30s — aceptable: es una
   * búsqueda por índice único (TokenSesion.token), y ya era el peor caso de antes.
   */
  async validate(req: Request, payload: JwtPayload): Promise<AuthenticatedUser> {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    const sesion = token
      ? await this.prisma.tokenSesion.findUnique({
          where: { token },
          select: { expiresAt: true, usuario: { select: { activo: true, empresa: { select: { estado: true } } } } },
        })
      : null;

    // `estado !== "activa"` (no solo "suspendida") — ver el comentario en auth.service.ts.
    const empresaBloqueada = sesion?.usuario.empresa != null && sesion.usuario.empresa.estado !== "activa";
    if (!sesion || sesion.expiresAt < new Date() || !sesion.usuario.activo || empresaBloqueada) {
      throw new UnauthorizedException("Esta sesión ya no es válida. Vuelve a iniciar sesión.");
    }

    return { userId: payload.sub, email: payload.email, rol: payload.rol, empresaId: payload.empresaId ?? null };
  }
}
