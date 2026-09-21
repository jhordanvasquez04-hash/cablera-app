import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Rol } from "@cablera/shared";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import type { AuthenticatedUser } from "../decorators/current-user.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const { user } = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();

    // Una ruta sin @Roles() es de negocio por defecto (gestor/cobrador): super_admin NO entra
    // automáticamente a ningún endpoint del negocio de un tenant salvo que se le liste a propósito,
    // ya que no tiene empresaId y rompería cualquier lectura/escritura con aislamiento por tenant.
    if (!requiredRoles || requiredRoles.length === 0) {
      return user.rol !== "super_admin";
    }

    return requiredRoles.includes(user.rol);
  }
}
