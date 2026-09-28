import { IsString, MinLength } from "class-validator";
import { RegistrarPagoSuscripcionDto } from "./registrar-pago-suscripcion.dto";

// Para POST /admin/pagos-suscripcion (sin :id de empresa en la ruta, a diferencia de
// POST /admin/empresas/:id/pagos-suscripcion) — el formulario "Registrar pago" de Keysls elige
// la empresa dentro del propio modal, no desde la URL. Con ValidationPipe({ whitelist: true }),
// `& { empresaId }` sobre el DTO base NO alcanza: el campo no declarado se descarta en
// silencio antes de llegar al controller, así que necesita ser una clase propia.
export class RegistrarPagoSuscripcionGlobalDto extends RegistrarPagoSuscripcionDto {
  @IsString()
  @MinLength(1)
  empresaId!: string;
}
