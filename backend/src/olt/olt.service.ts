import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TenantPrismaService, type ScopedPrismaClient } from "../prisma/tenant-prisma.service";
import { cifrarCredencial } from "../common/credenciales-cifrado.util";
import type { CreateOltDto } from "./dto/create-olt.dto";
import type { UpdateOltDto } from "./dto/update-olt.dto";

function sinPassword<T extends { passwordCifrado: string }>(olt: T) {
  const { passwordCifrado: _omitido, ...resto } = olt;
  return resto;
}

@Injectable()
export class OltService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private configService: ConfigService,
  ) {}

  private get prisma(): ScopedPrismaClient {
    return this.tenantPrisma.client;
  }

  async listar() {
    const olts = await this.prisma.olt.findMany({ orderBy: [{ activo: "desc" }, { nombre: "asc" }] });
    return olts.map(sinPassword);
  }

  private async obtener(id: string) {
    const olt = await this.prisma.olt.findUnique({ where: { id } });
    if (!olt) {
      throw new NotFoundException("OLT no encontrado");
    }
    return olt;
  }

  async crear(dto: CreateOltDto, empresaId: string) {
    const olt = await this.prisma.olt.create({
      data: {
        nombre: dto.nombre.trim(),
        ip: dto.ip.trim(),
        puerto: dto.puerto ?? 22,
        puertoTelnet: dto.puertoTelnet ?? 23,
        puertoSnmp: dto.puertoSnmp ?? 161,
        comunidadSnmp: dto.comunidadSnmp?.trim() || "public",
        fabricante: dto.fabricante.trim(),
        modelo: dto.modelo.trim(),
        usuario: dto.usuario.trim(),
        passwordCifrado: cifrarCredencial(this.configService, dto.password),
        notas: dto.notas?.trim() || null,
        empresaId,
      },
    });
    return sinPassword(olt);
  }

  async actualizar(id: string, dto: UpdateOltDto) {
    await this.obtener(id);
    const olt = await this.prisma.olt.update({
      where: { id },
      data: {
        nombre: dto.nombre?.trim(),
        ip: dto.ip?.trim(),
        puerto: dto.puerto,
        puertoTelnet: dto.puertoTelnet,
        puertoSnmp: dto.puertoSnmp,
        comunidadSnmp: dto.comunidadSnmp?.trim(),
        fabricante: dto.fabricante?.trim(),
        modelo: dto.modelo?.trim(),
        usuario: dto.usuario?.trim(),
        passwordCifrado: dto.password ? cifrarCredencial(this.configService, dto.password) : undefined,
        notas: dto.notas?.trim(),
        activo: dto.activo,
      },
    });
    return sinPassword(olt);
  }
}
