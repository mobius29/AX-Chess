import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import type { JwtPayload } from "../auth/auth.decorator";
import { CreateGameRequestDTO } from "./dtos/create-game.dto";
import { SubmitMoveRequestDTO } from "./dtos/submit-move.dto";
import { GamesService } from "./games.service";

@UseGuards(AuthGuard)
@Controller("games")
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post()
  createGame(@CurrentUser() user: JwtPayload, @Body() dto: CreateGameRequestDTO) {
    return this.gamesService.createGame(user.sub, dto.color, dto.difficulty);
  }

  @HttpCode(HttpStatus.OK)
  @Get("active")
  getActiveGame(@CurrentUser() user: JwtPayload) {
    return this.gamesService.getActiveGame(user.sub);
  }

  @HttpCode(HttpStatus.OK)
  @Get(":id")
  getGame(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.gamesService.getGame(user.sub, id);
  }

  @HttpCode(HttpStatus.OK)
  @Post(":id/moves")
  submitMove(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: SubmitMoveRequestDTO) {
    return this.gamesService.submitMove(user.sub, id, dto.move);
  }

  @HttpCode(HttpStatus.OK)
  @Post(":id/ai-move")
  retryAiMove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.gamesService.retryAiMove(user.sub, id);
  }

  @HttpCode(HttpStatus.OK)
  @Post(":id/resign")
  resign(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.gamesService.resign(user.sub, id);
  }
}
