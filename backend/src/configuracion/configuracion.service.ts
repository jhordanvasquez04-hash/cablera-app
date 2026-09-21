import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { UpdateConfiguracionDto } from "./dto/update-configuracion.dto";

// Sigue siendo singleton (no TenantPrismaService): el cron de generación de cargos
// (sin request/empresa en contexto) también necesita leer la configuración de CADA
// empresa activa, una por una — así que `empresaId` viaja explícito en cada método en
// vez de resolverse por inyección. Usa el PrismaService crudo con el filtro a mano.
@Injectable()
export class ConfiguracionService {
  constructor(private prisma: PrismaService) {}

  async getConfiguracion(empresaId: string) {
    return this.prisma.configuracion.upsert({
      where: { empresaId },
      update: {},
      create: { nombreEmpresa: "Mi Cablera", empresaId },
    });
  }

  /**
   * Para la ruta pública `GET /configuracion` (branding de la pantalla de login, antes de
   * autenticar — no hay empresaId todavía). Devuelve la configuración de la primera
   * empresa creada. Con un solo tenant hoy esto es correcto; el día que haya más de una
   * empresa real, la pantalla de login necesitará alguna forma de elegir/identificar el
   * tenant (subdominio, selector, etc.) antes de poder resolver esto correctamente —
   * limitación conocida, no resuelta en este retrofit.
   */
  async getConfiguracionPublica() {
    // Solo lo necesario para pintar el login; el resto (RUC, contacto, facturación) requiere sesión.
    return this.prisma.configuracion.findFirstOrThrow({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        nombreEmpresa: true,
        logoUrl: true,
        colorPrimario: true,
        colorSecundario: true,
        fechaFacturacionGlobal: true,
        formatoBoletaDefault: true,
        modoCaja: true,
      },
    });
  }

  async updateConfiguracion(empresaId: string, dto: UpdateConfiguracionDto) {
    await this.getConfiguracion(empresaId);
    return this.prisma.configuracion.update({
      where: { empresaId },
      data: dto,
    });
  }

  async actualizarLogo(empresaId: string, logoUrl: string | null) {
    await this.getConfiguracion(empresaId);
    return this.prisma.configuracion.update({
      where: { empresaId },
      data: { logoUrl },
    });
  }
}
