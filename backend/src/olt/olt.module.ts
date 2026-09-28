import { Module } from "@nestjs/common";
import { OltController } from "./olt.controller";
import { OltService } from "./olt.service";

@Module({
  controllers: [OltController],
  providers: [OltService],
  exports: [OltService],
})
export class OltModule {}
