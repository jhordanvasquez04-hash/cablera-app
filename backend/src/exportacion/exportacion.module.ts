import { Module } from "@nestjs/common";
import { ExportacionController } from "./exportacion.controller";
import { ExportacionService } from "./exportacion.service";
import { ExportacionCronService } from "./exportacion-cron.service";

@Module({
  controllers: [ExportacionController],
  providers: [ExportacionService, ExportacionCronService],
})
export class ExportacionModule {}
