import { Module } from "@nestjs/common";
import { OnusController } from "./onus.controller";
import { OnusService } from "./onus.service";

@Module({
  controllers: [OnusController],
  providers: [OnusService],
})
export class OnusModule {}
