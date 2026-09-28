import { createParamDecorator, ExecutionContext } from "@nestjs/common";

// Deliberadamente NO es un AuthenticatedUser (sin `rol`): un técnico no es un Usuario del
// panel — ver el comentario en tecnico-auth.guard.ts sobre por qué el portal de técnicos
// corre en su propia línea de autenticación, aparte de JwtAuthGuard/RolesGuard.
export interface AuthenticatedTecnico {
  tecnicoId: string;
  email: string;
  empresaId: string;
}

export const CurrentTecnico = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedTecnico => {
  const request = ctx.switchToHttp().getRequest();
  return request.tecnico;
});
