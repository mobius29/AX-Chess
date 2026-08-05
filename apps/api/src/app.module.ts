import { Module } from "@nestjs/common";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ChessService } from "./chess/chess.service";
import { EngineService } from "./engine/engine.service";

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, ChessService, EngineService],
})
export class AppModule {}
