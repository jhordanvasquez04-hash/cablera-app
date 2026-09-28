import { Body, Controller, Get, NotFoundException, Param, Post, Query, UseGuards } from "@nestjs/common";
import type { EstadoOrdenServicio } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PortalTecnicoOrdenesService } from "./portal-tecnico-ordenes.service";
import { PortalTecnicoOnusService } from "./portal-tecnico-onus.service";
import { CompletarOrdenDto } from "./dto/completar-orden.dto";
import { CreateOnuDto } from "../onus/dto/create-onu.dto";
import { Public } from "../auth/decorators/public.decorator";
import { TecnicoAuthGuard } from "../auth/guards/tecnico-auth.guard";
import { CurrentTecnico, type AuthenticatedTecnico } from "../auth/decorators/current-tecnico.decorator";

// Portal de campo: perfil propio + las órdenes de servicio asignadas al técnico autenticado.
@Public()
@UseGuards(TecnicoAuthGuard)
@Controller("portal-tecnico")
export class PortalTecnicoController {
  constructor(
    private prisma: PrismaService,
    private ordenesService: PortalTecnicoOrdenesService,
    private onusService: PortalTecnicoOnusService,
  ) {}

  @Get("perfil")
  async perfil(@CurrentTecnico() tecnico: AuthenticatedTecnico) {
    const datos = await this.prisma.tecnico.findUnique({
      where: { id: tecnico.tecnicoId },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        zona: true,
        vehiculo: true,
        empresa: { select: { nombre: true } },
      },
    });
    if (!datos) {
      throw new NotFoundException("Técnico no encontrado");
    }
    return datos;
  }

  @Get("ordenes")
  listarOrdenes(@CurrentTecnico() tecnico: AuthenticatedTecnico, @Query("estado") estado?: EstadoOrdenServicio) {
    return this.ordenesService.listarMisOrdenes(tecnico, estado);
  }

  @Get("ordenes/:id")
  obtenerOrden(@Param("id") id: string, @CurrentTecnico() tecnico: AuthenticatedTecnico) {
    return this.ordenesService.obtener(id, tecnico);
  }

  @Post("ordenes/:id/aceptar")
  aceptar(@Param("id") id: string, @CurrentTecnico() tecnico: AuthenticatedTecnico) {
    return this.ordenesService.aceptar(id, tecnico);
  }

  @Post("ordenes/:id/iniciar")
  iniciar(@Param("id") id: string, @CurrentTecnico() tecnico: AuthenticatedTecnico) {
    return this.ordenesService.iniciar(id, tecnico);
  }

  @Post("ordenes/:id/completar")
  completar(@Param("id") id: string, @CurrentTecnico() tecnico: AuthenticatedTecnico, @Body() dto: CompletarOrdenDto) {
    return this.ordenesService.completar(id, tecnico, dto);
  }

  // Catálogo de materiales disponibles, para elegir qué reportar como consumo al completar
  // una orden (ver dto/consumo-item.dto.ts). Sin stock/costos sensibles del negocio: solo lo
  // mínimo para que el técnico sepa qué existe y cuánto queda.
  @Get("productos")
  async listarProductos(@CurrentTecnico() tecnico: AuthenticatedTecnico) {
    const productos = await this.prisma.producto.findMany({
      where: { empresaId: tecnico.empresaId, activo: true },
      select: { id: true, nombre: true, unidad: true, esMedible: true, stockTotal: true, metrosDisponibles: true },
      orderBy: { nombre: "asc" },
    });
    return productos;
  }

  // Registra el resultado de autorizar una ONU en campo (autorizada o fallida) — historial,
  // no una acción en vivo contra el OLT (ver el comentario en onus.service.ts).
  @Post("onus")
  crearOnu(@Body() dto: CreateOnuDto, @CurrentTecnico() tecnico: AuthenticatedTecnico) {
    return this.onusService.crear(dto, tecnico);
  }
}
