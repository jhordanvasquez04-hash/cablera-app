import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthenticatedUser } from "../decorators/current-user.decorator";

interface JwtPayload {
  sub: string;
  email: string;
  rol: AuthenticatedUser["rol"];
  empresaId: string | null;
}

interface EstadoCuenta {
  puedeEntrar: boolean;
  hasta: number;
}

// Cuánto se recuerda el estado de una cuenta antes de volver a consultarlo: suspender una empresa
// o desactivar un usuario corta sus sesiones en, como mucho, este tiempo (sin una consulta a la
// base por cada request).
const VIGENCIA_ESTADO_MS = 30_000;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly estadoCuentas = new Map<string, EstadoCuenta>();

  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("JWT_SECRET"),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // Un token emitido antes de suspender la empresa o desactivar la cuenta sigue siendo
    // criptográficamente válido: se corta aquí para que ambas acciones surtan efecto sin esperar
    // al vencimiento natural del token (hasta VIGENCIA_ESTADO_MS de retraso).
    if (!(await this.puedeEntrar(payload.sub))) {
      throw new UnauthorizedException("Esta cuenta ya no tiene acceso. Contacta al administrador.");
    }
    return { userId: payload.sub, email: payload.email, rol: payload.rol, empresaId: payload.empresaId ?? null };
  }

  private async puedeEntrar(usuarioId: string): Promise<boolean> {
    const recordado = this.estadoCuentas.get(usuarioId);
    if (recordado && recordado.hasta > Date.now()) return recordado.puedeEntrar;

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { activo: true, empresa: { select: { estado: true } } },
    });
    const puedeEntrar = !!usuario?.activo && usuario.empresa?.estado !== "suspendida";
    this.estadoCuentas.set(usuarioId, { puedeEntrar, hasta: Date.now() + VIGENCIA_ESTADO_MS });
    return puedeEntrar;
  }
}
