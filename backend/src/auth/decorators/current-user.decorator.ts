import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Rol } from "@cablera/shared";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  rol: Rol;
  // null solo para super_admin (cuenta fuera de cualquier empresa). Fase 1: se agrega al
  // token pero ningún guard/servicio lo consume todavía.
  empresaId: string | null;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
