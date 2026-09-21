import { Inject, Injectable, InternalServerErrorException, Scope } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { PrismaService } from "./prisma.service";
import type { AuthenticatedUser } from "../auth/decorators/current-user.decorator";

// Modelos de negocio que pertenecen a una empresa. `super_admin` (empresaId null) nunca
// debería tocar estos modelos a través de este cliente — ver el chequeo en el constructor.
const TENANT_SCOPED_MODELS = new Set([
  "Usuario",
  "Configuracion",
  "Zona",
  "TipoServicio",
  "Cliente",
  "Descuento",
  "CargoMensual",
  "Boleta",
  "Pago",
  "CategoriaEgreso",
  "MovimientoCaja",
  "GastoReportado",
  "TipoServicioTecnico",
  "ServicioTecnico",
]);

/**
 * Envuelve el PrismaClient para que TODAS las operaciones sobre modelos de negocio queden
 * filtradas/etiquetadas por `empresaId`, sin tocar cada servicio uno por uno:
 * - En lecturas/update/delete/upsert/count/aggregate: mezcla `empresaId` en el `where`.
 * - En create/createMany/upsert.create: agrega `empresaId` a los datos. Como `empresaId`
 *   es un campo requerido del modelo, TypeScript exige este valor en cada `.create(...)`
 *   existente en el código — es decir, el compilador audita que no se nos escape ningún
 *   punto de creación al retirofitear los servicios (ver comentario en cada create call).
 *
 * Excepción conocida: un `create` ANIDADO (ej. `boleta.create({ data: { pagos: { create: [...] } } })`)
 * no pasa por el `args.data` de nivel superior que esta extensión intercepta, así que esos
 * dos sitios (BoletasService, ImportacionService) necesitan la línea de `empresaId` a mano
 * en el objeto anidado.
 */
// Exportada (no solo de uso interno) para que el script de prueba de aislamiento
// (prisma/verificar-aislamiento.ts) reutilice exactamente esta misma lógica.
export function scopedClient(prisma: PrismaService, empresaId: string) {
  return prisma.$extends({
    name: `tenant:${empresaId}`,
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }
          const a = args as Record<string, any>;
          switch (operation) {
            case "findUnique":
            case "findUniqueOrThrow":
            case "update":
            case "delete":
              a.where = { ...a.where, empresaId };
              break;
            case "findFirst":
            case "findFirstOrThrow":
            case "findMany":
            case "count":
            case "aggregate":
            case "groupBy":
            case "updateMany":
            case "deleteMany":
              a.where = a.where ? { AND: [a.where, { empresaId }] } : { empresaId };
              break;
            case "upsert":
              a.where = { ...a.where, empresaId };
              a.create = { ...a.create, empresaId };
              a.update = { ...a.update, empresaId };
              break;
            case "create":
              a.data = { ...a.data, empresaId };
              break;
            case "createMany":
              a.data = Array.isArray(a.data)
                ? a.data.map((d: Record<string, any>) => ({ ...d, empresaId }))
                : { ...a.data, empresaId };
              break;
          }
          return query(a as typeof args);
        },
      },
    },
  });
}

export type ScopedPrismaClient = ReturnType<typeof scopedClient>;

/**
 * Cliente Prisma con alcance de request: cada request HTTP obtiene su propia instancia,
 * ya filtrada por la empresa del usuario autenticado. Los servicios de features deben
 * inyectar ESTE servicio (nunca `PrismaService` directo) para que el aislamiento por
 * tenant sea automático. `AdminModule` y los servicios de cron/backup son la única
 * excepción intencional: ellos sí operan cruzando empresas y siguen usando `PrismaService`.
 *
 * Importante: la lectura de `request.user` es PEREZOSA (dentro de los getters, no cacheada
 * en el constructor), por DOS razones:
 * 1. Nest instancia los providers Scope.REQUEST (parte de la cadena de DI del controller)
 *    ANTES de correr los guards globales — en el constructor, `request.user` todavía no
 *    existe; recién lo pone ahí JwtAuthGuard. Cachearlo ahí siempre daría `null`.
 * 2. `UsuariosService` (usado también durante /auth/login, una ruta @Public() sin
 *    request.user en absoluto) inyecta este servicio junto con el PrismaService crudo; si
 *    el getter lanzara desde el constructor, resolver UsuariosService para el login
 *    reventaría antes de siquiera llegar a `findByEmail`.
 * Al ser perezoso, solo revienta si algo intenta usar `.client`/`.empresaId` sin una
 * empresa real en el token — que es exactamente el caso que queremos bloquear.
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantPrismaService {
  private readonly rawPrisma: PrismaService;
  private clienteCacheado?: ScopedPrismaClient;

  constructor(
    @Inject(REQUEST) private readonly request: { user?: AuthenticatedUser },
    prisma: PrismaService,
  ) {
    this.rawPrisma = prisma;
  }

  get empresaId(): string {
    // request.user se lee PEREZOSAMENTE (no en el constructor a caché): Nest instancia los
    // providers Scope.REQUEST (este incluido, vía la cadena de DI del controller) ANTES de
    // correr los guards globales, así que en el constructor `request.user` todavía no existe
    // — recién lo pone ahí JwtAuthGuard. Para cuando el método del controller de verdad se
    // ejecuta (y por lo tanto cualquier código que llegue a leer este getter), los guards ya
    // corrieron sobre ese mismo objeto `request` mutable, así que aquí sí está poblado.
    const empresaIdCruda = this.request.user?.empresaId ?? null;
    if (!empresaIdCruda) {
      // Un token super_admin (empresaId null), o una ruta sin usuario autenticado aún,
      // intentando usar el cliente de tenant — preferible que reviente acá (fail-closed)
      // a que corra sin filtro.
      throw new InternalServerErrorException("Esta acción requiere una cuenta asociada a una empresa");
    }
    return empresaIdCruda;
  }

  get client(): ScopedPrismaClient {
    if (!this.clienteCacheado) {
      this.clienteCacheado = scopedClient(this.rawPrisma, this.empresaId);
    }
    return this.clienteCacheado;
  }
}
