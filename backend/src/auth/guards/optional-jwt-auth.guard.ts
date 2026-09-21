import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Para rutas @Public() que además quieren saber quién llama si trae un token válido (por ejemplo
 * `GET /configuracion`: sin token devuelve la marca pública; con token, la de SU empresa).
 * Nunca rechaza: un token ausente, vencido o inválido simplemente deja `request.user` en null.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser>(_error: unknown, user: TUser | false): TUser | null {
    return user || null;
  }
}
