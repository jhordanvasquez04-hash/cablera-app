import { Body, Controller, Get, Param, Patch, Post, Query, Res } from "@nestjs/common";
import type { EstadoServicio } from "@prisma/client";
import { ClientesService } from "./clientes.service";
import { CreateClienteDto } from "./dto/create-cliente.dto";
import { UpdateClienteDto } from "./dto/update-cliente.dto";
import { CreateServicioContratadoDto } from "./dto/create-servicio-contratado.dto";
import { UpdateServicioContratadoDto } from "./dto/update-servicio-contratado.dto";
import { DarDeBajaDto } from "./dto/dar-de-baja.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CargosService } from "../cargos/cargos.service";
import { BoletasService } from "../boletas/boletas.service";
import { DescuentosService } from "../descuentos/descuentos.service";
import { CreateDescuentoDto } from "../descuentos/dto/create-descuento.dto";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Roles("gestor")
@Controller("clientes")
export class ClientesController {
  constructor(
    private clientesService: ClientesService,
    private cargosService: CargosService,
    private boletasService: BoletasService,
    private descuentosService: DescuentosService,
  ) {}

  @Roles("gestor", "cobrador")
  @Get()
  async listar(
    @Res({ passthrough: true }) res: { set: (header: string, value: string) => void },
    @Query("zonaId") zonaId?: string,
    @Query("estado") estado?: EstadoServicio,
    @Query("busqueda") busqueda?: string,
    @Query("pagina") pagina?: string,
    @Query("porPagina") porPagina?: string,
  ) {
    const { datos, total } = await this.clientesService.listar({
      zonaId,
      estado,
      busqueda,
      pagina: pagina ? Number(pagina) : undefined,
      porPagina: porPagina ? Number(porPagina) : undefined,
    });
    if (total !== undefined) {
      res.set("X-Total-Count", String(total));
    }
    return datos;
  }

  @Roles("gestor", "cobrador")
  @Get("estadisticas")
  estadisticas() {
    return this.clientesService.estadisticas();
  }

  @Roles("gestor", "cobrador")
  @Get(":id")
  obtener(@Param("id") id: string) {
    return this.clientesService.obtener(id);
  }

  @Roles("gestor", "cobrador")
  @Get(":id/cargos-pendientes")
  cargosPendientes(@Param("id") id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.cargosService.listarPendientesPorCliente(id, usuario.empresaId!);
  }

  @Roles("gestor", "cobrador")
  @Get(":id/ficha")
  async ficha(@Param("id") id: string, @CurrentUser() usuario: AuthenticatedUser) {
    const [cliente, cargosMesAMes, historialPagos] = await Promise.all([
      this.clientesService.obtener(id),
      this.cargosService.listarTodosPorCliente(id, usuario.empresaId!),
      this.boletasService.listar({ clienteId: id }),
    ]);

    const saldoTotal = Number(cargosMesAMes.reduce((suma, cargo) => suma + cargo.saldo, 0).toFixed(2));

    return { cliente, saldoTotal, cargosMesAMes, historialPagos };
  }

  @Get(":id/servicios/:servicioId/descuentos")
  descuentos(@Param("servicioId") servicioId: string) {
    return this.descuentosService.listarPorServicio(servicioId);
  }

  @Post(":id/servicios/:servicioId/descuentos")
  aplicarDescuento(
    @Param("id") id: string,
    @Param("servicioId") servicioId: string,
    @Body() dto: CreateDescuentoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.descuentosService.crear(servicioId, id, dto, usuario.empresaId!);
  }

  @Post()
  crear(@Body() dto: CreateClienteDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.clientesService.crear(dto, usuario.empresaId!);
  }

  @Patch(":id")
  actualizar(@Param("id") id: string, @Body() dto: UpdateClienteDto) {
    return this.clientesService.actualizar(id, dto);
  }

  @Post(":id/baja")
  darDeBaja(@Param("id") id: string, @Body() dto: DarDeBajaDto) {
    return this.clientesService.darDeBaja(id, dto.motivo);
  }

  @Post(":id/suspender")
  suspender(@Param("id") id: string) {
    return this.clientesService.suspender(id);
  }

  @Post(":id/activar")
  activar(@Param("id") id: string) {
    return this.clientesService.activar(id);
  }

  @Post(":id/servicios")
  agregarServicio(@Param("id") id: string, @Body() dto: CreateServicioContratadoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.clientesService.agregarServicio(id, dto, usuario.empresaId!);
  }

  @Patch(":id/servicios/:servicioId")
  actualizarServicio(@Param("id") id: string, @Param("servicioId") servicioId: string, @Body() dto: UpdateServicioContratadoDto) {
    return this.clientesService.actualizarServicio(id, servicioId, dto);
  }

  @Post(":id/servicios/:servicioId/suspender")
  suspenderServicio(@Param("id") id: string, @Param("servicioId") servicioId: string) {
    return this.clientesService.suspenderServicio(id, servicioId);
  }

  @Post(":id/servicios/:servicioId/activar")
  activarServicio(@Param("id") id: string, @Param("servicioId") servicioId: string) {
    return this.clientesService.activarServicio(id, servicioId);
  }

  @Post(":id/servicios/:servicioId/baja")
  darDeBajaServicio(@Param("id") id: string, @Param("servicioId") servicioId: string, @Body() dto: DarDeBajaDto) {
    return this.clientesService.darDeBajaServicio(id, servicioId, dto.motivo);
  }
}
