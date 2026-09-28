import { Module } from "@nestjs/common";
import { ReniecController } from "./reniec.controller";
import { ReniecService } from "./reniec.service";

@Module({
  controllers: [ReniecController],
  providers: [ReniecService],
})
export class ReniecModule {}
