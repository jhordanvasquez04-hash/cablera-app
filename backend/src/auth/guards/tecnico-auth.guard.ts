import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthenticatedTecnico } from "../decorators/current-tecnico.decorator";

interface TecnicoJwtPayload {
  sub: string;
  email: string;
  tipo: "tecnico";
  empresaId: string;
}

/**
 * Autenticación del portal de campo, DELIBERADAMENTE separada de JwtAuthGuard/RolesGuard.
 *
 * Un técnico no es un Usuario del panel (no tiene `rol` de gestor/cobrador/super_admin) — si
 * se le agregara "tecnico" a `Rol` para reutilizar el guard global, cualquier endpoint de
 * negocio SIN `@Roles()` (la mayoría: ver el comentario en roles.guard.ts, son gestor/cobrador
 * por defecto) le quedaría accesible por accidente. En vez de eso, cada controller del portal
 * de técnicos se marca `@Public()` (así JwtAuthGuard/RolesGuard lo saltan por completo) y agrega
 * este guard explícitamente — un token de técnico nunca entra a una ruta que no lo pida a propósito.
 *
 * Verifica el JWT a mano (mismo JwtService/secreto que emite /auth/tecnico/login) y consulta el
 * estado de la cuenta en cada request — sin caché de 30s como JwtStrategy: el tráfico del portal
 * de campo es bajo, así que revocar (desactivar el técnico o suspender la empresa) surte efecto
 * de inmediato sin ese costo de complejidad.
 */
@Injectable()
export class TecnicoAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers?.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (!token) {
      throw new UnauthorizedException("Falta el token de acceso");
    }

    let payload: TecnicoJwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<TecnicoJwtPayload>(token);
    } catch {
      throw new UnauthorizedException("Token inválido o vencido");
    }
    if (payload.tipo !== "tecnico") {
      throw new UnauthorizedException("Token inválido para este portal");
    }

    const tecnico = await this.prisma.tecnico.findUnique({
      where: { id: payload.sub },
      select: { activo: true, empresa: { select: { estado: true } } },
    });
    // `!== "activa"` — ver el comentario en auth.service.ts (cubre "morosa" también).
    if (!tecnico?.activo || tecnico.empresa.estado !== "activa") {
      throw new UnauthorizedException("Esta cuenta ya no tiene acceso");
    }

    const tecnicoAutenticado: AuthenticatedTecnico = { tecnicoId: payload.sub, email: payload.email, empresaId: payload.empresaId };
    request.tecnico = tecnicoAutenticado;
    return true;
  }
}
