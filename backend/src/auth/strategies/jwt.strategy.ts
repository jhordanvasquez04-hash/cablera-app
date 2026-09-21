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

// Cuánto se recuerda el estado de una empresa antes de volver a consultarlo: suspender una empresa
// corta sus sesiones en, como mucho, este tiempo (sin una consulta a la base por cada request).
const VIGENCIA_ESTADO_MS = 30_000;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly estadoEmpresas = new Map<string, { activa: boolean; hasta: number }>();

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
    // Un token emitido antes de suspender la empresa sigue siendo criptográficamente válido:
    // se corta aquí para que la suspensión desde el panel proveedor surta efecto sin esperar al vencimiento.
    if (payload.empresaId && !(await this.empresaActiva(payload.empresaId))) {
      throw new UnauthorizedException("Esta empresa está suspendida. Contacta al administrador.");
    }
    return { userId: payload.sub, email: payload.email, rol: payload.rol, empresaId: payload.empresaId ?? null };
  }

  private async empresaActiva(empresaId: string): Promise<boolean> {
    const recordado = this.estadoEmpresas.get(empresaId);
    if (recordado && recordado.hasta > Date.now()) return recordado.activa;

    const empresa = await this.prisma.empresa.findUnique({ where: { id: empresaId }, select: { estado: true } });
    const activa = empresa?.estado === "activa";
    this.estadoEmpresas.set(empresaId, { activa, hasta: Date.now() + VIGENCIA_ESTADO_MS });
    return activa;
  }
}
