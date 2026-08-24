import { Module } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard";
import { ChessModule } from "../chess/chess.module";
import { EngineModule } from "../engine/engine.module";
import { GamesController } from "./games.controller";
import { GamesService } from "./games.service";
import { ReviewService } from "./review.service";

@Module({
  imports: [ChessModule, EngineModule],
  controllers: [GamesController],
  providers: [GamesService, ReviewService, AuthGuard],
})
export class GamesModule {}
