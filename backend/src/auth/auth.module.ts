import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TecnicoAuthService } from "./tecnico-auth.service";
import { LoginThrottle } from "./login-throttle";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { TecnicoAuthGuard } from "./guards/tecnico-auth.guard";
import { UsuariosModule } from "../usuarios/usuarios.module";
import { TecnicosModule } from "../tecnicos/tecnicos.module";

const JwtModuleConfigurado = JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    secret: configService.getOrThrow<string>("JWT_SECRET"),
    signOptions: { expiresIn: configService.get<string>("JWT_EXPIRES_IN", "8h") },
  }),
});

@Module({
  imports: [UsuariosModule, TecnicosModule, PassportModule, JwtModuleConfigurado],
  controllers: [AuthController],
  providers: [AuthService, TecnicoAuthService, JwtStrategy, LoginThrottle, TecnicoAuthGuard],
  // TecnicoAuthGuard lo usa PortalTecnicoModule (fuera de este módulo) para proteger sus rutas.
  // También hay que reexportar el propio JwtModule: como guard pasado por clase a @UseGuards(),
  // Nest resuelve las dependencias del constructor de TecnicoAuthGuard (JwtService) contra el
  // grafo de imports del módulo QUE LO CONSUME (PortalTecnicoModule), no solo el de este módulo
  // — así que JwtService tiene que quedar visible al importar AuthModule, no solo el guard.
  exports: [TecnicoAuthGuard, JwtModuleConfigurado],
})
export class AuthModule {}
