import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { PrismaExceptionFilter } from "./prisma/prisma-exception.filter";
import { AuthModule } from "./auth/auth.module";
import { UsuariosModule } from "./usuarios/usuarios.module";
import { ConfiguracionModule } from "./configuracion/configuracion.module";
import { AdminModule } from "./admin/admin.module";
import { ZonasModule } from "./zonas/zonas.module";
import { TiposServicioModule } from "./tipos-servicio/tipos-servicio.module";
import { ClientesModule } from "./clientes/clientes.module";
import { ImportacionModule } from "./importacion/importacion.module";
import { CargosModule } from "./cargos/cargos.module";
import { BoletasModule } from "./boletas/boletas.module";
import { CobranzaModule } from "./cobranza/cobranza.module";
import { CajaModule } from "./caja/caja.module";
import { DescuentosModule } from "./descuentos/descuentos.module";
import { CronModule } from "./cron/cron.module";
import { ExportacionModule } from "./exportacion/exportacion.module";
import { TiposServicioTecnicoModule } from "./tipos-servicio-tecnico/tipos-servicio-tecnico.module";
import { ServiciosTecnicosModule } from "./servicios-tecnicos/servicios-tecnicos.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { RolesGuard } from "./auth/guards/roles.guard";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    ConfiguracionModule,
    AdminModule,
    ZonasModule,
    TiposServicioModule,
    ClientesModule,
    ImportacionModule,
    CargosModule,
    BoletasModule,
    CobranzaModule,
    CajaModule,
    DescuentosModule,
    CronModule,
    ExportacionModule,
    TiposServicioTecnicoModule,
    ServiciosTecnicosModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
