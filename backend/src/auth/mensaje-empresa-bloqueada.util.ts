import type { EstadoEmpresa } from "@prisma/client";

/**
 * Mensaje de login bloqueado, según el estado REAL de la empresa — antes decía "suspendida"
 * siempre, aunque el motivo fuera "morosa" (fusión con Keysls: sin pago de suscripción del
 * mes). Compartido entre auth.service.ts (Usuario) y tecnico-auth.service.ts (Tecnico): ambos
 * bloquean con el mismo criterio `estado !== "activa"`, así que el texto debe coincidir.
 */
export function mensajeEmpresaBloqueada(estado: EstadoEmpresa): string {
  if (estado === "morosa") {
    return "Esta empresa tiene pagos pendientes. Contacta al administrador.";
  }
  return "Esta empresa está suspendida. Contacta al administrador.";
}
