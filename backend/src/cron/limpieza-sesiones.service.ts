import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";

/** Barre TokenSesion vencidas — sin esto la tabla crece sin límite (una fila por login, para
 * siempre). No afecta la seguridad: una sesión vencida ya es rechazada por JwtStrategy aunque
 * la fila siga ahí (expiresAt < now), esto es solo housekeeping. */
@Injectable()
export class LimpiezaSesionesService {
  private readonly logger = new Logger(LimpiezaSesionesService.name);

  constructor(private prisma: PrismaService) {}

  @Cron("0 3 * * *")
  async limpiarSesionesVencidas() {
    const resultado = await this.prisma.tokenSesion.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    if (resultado.count > 0) {
      this.logger.log(`Limpieza de sesiones: ${resultado.count} token(s) vencido(s) eliminado(s)`);
    }
  }
}
