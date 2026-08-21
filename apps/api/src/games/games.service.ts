import type { Color, ColorChoice, Difficulty, GameResult, ResignResponse, SubmitMoveResponse } from "@ax-chess/shared";
import { Injectable } from "@nestjs/common";
import type { Chess } from "chess.js";

import { Game, Prisma } from "../../generated/prisma/client";
import { AppliedMove, ChessService, IllegalMoveError, Outcome } from "../chess/chess.service";
import { EngineService, EngineUnavailableError } from "../engine/engine.service";
import { PrismaService } from "../prisma.service";
import {
  ActiveGameExistsException,
  EngineUnavailableException,
  GameAlreadyFinishedException,
  GameForbiddenException,
  GameNotFoundException,
  IllegalMoveException,
  NotAiTurnException,
  NotYourTurnException,
} from "./games.errors";
import { toGameStateDto } from "./games.mapper";

const MOVES_ORDER_BY_PLY = { orderBy: { ply: "asc" as const } };

function colorToSide(color: Color): "w" | "b" {
  return color === "white" ? "w" : "b";
}

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chess: ChessService,
    private readonly engine: EngineService,
  ) {}

  private async findOwnedGame(userId: string, gameId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { moves: MOVES_ORDER_BY_PLY },
    });
    if (!game) throw new GameNotFoundException();
    if (game.userId !== userId) throw new GameForbiddenException();

    return game;
  }

  private deriveState(game: Game & { moves: { san: string }[] }): {
    board: Chess;
    state: ReturnType<typeof toGameStateDto>;
  } {
    const sans = game.moves.map((move) => move.san);
    const board = this.chess.replay(sans);
    const turn: Color | null = game.status === "finished" ? null : board.turn() === "w" ? "white" : "black";
    const inCheck = game.status === "active" && board.inCheck();

    return { board, state: toGameStateDto({ game, moves: sans, turn, inCheck }) };
  }

  private async finishGame(gameId: string, humanColor: Color, outcome: Outcome, moveCount: number) {
    const result: GameResult =
      outcome.winner === null ? "draw" : outcome.winner === colorToSide(humanColor) ? "win" : "loss";

    const game = await this.prisma.game.update({
      where: { id: gameId },
      data: { status: "finished", result, endedReason: outcome.reason, moveCount, endedAt: new Date() },
      include: { moves: MOVES_ORDER_BY_PLY },
    });

    return this.deriveState(game).state;
  }

  private async playAiMove(
    gameId: string,
    humanColor: Color,
    difficulty: Difficulty,
    sans: string[],
    currentPly: number,
  ) {
    let applied: AppliedMove;
    try {
      const bestMoveUci = await this.engine.bestMove(sans, difficulty);
      applied = this.chess.applyMove(sans, bestMoveUci);
    } catch (error) {
      if (error instanceof EngineUnavailableError) throw new EngineUnavailableException();
      throw error;
    }

    const nextPly = currentPly + 1;
    const boardAfterAi = this.chess.replay([...sans, applied.san]);
    const outcome = this.chess.getOutcome(boardAfterAi);

    await this.prisma.move.create({ data: { gameId, ply: nextPly, san: applied.san } });

    if (outcome) {
      const state = await this.finishGame(gameId, humanColor, outcome, nextPly);
      return { state, aiMove: applied.san };
    }

    const game = await this.prisma.game.update({
      where: { id: gameId },
      data: { moveCount: nextPly },
      include: { moves: MOVES_ORDER_BY_PLY },
    });

    return { state: this.deriveState(game).state, aiMove: applied.san };
  }

  async createGame(userId: string, color: ColorChoice, difficulty: Difficulty) {
    const resolvedColor: Color = color === "random" ? (Math.random() < 0.5 ? "white" : "black") : color;

    let game: Game;
    try {
      game = await this.prisma.game.create({ data: { userId, color: resolvedColor, difficulty } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ActiveGameExistsException();
      }
      throw error;
    }

    if (resolvedColor === "black") {
      const { state } = await this.playAiMove(game.id, resolvedColor, difficulty, [], 0);
      return state;
    }

    return this.deriveState({ ...game, moves: [] }).state;
  }

  async getActiveGame(userId: string) {
    const game = await this.prisma.game.findFirst({
      where: { userId, status: "active" },
      include: { moves: MOVES_ORDER_BY_PLY },
    });

    return game ? this.deriveState(game).state : null;
  }

  async getGame(userId: string, gameId: string) {
    const game = await this.findOwnedGame(userId, gameId);
    return this.deriveState(game).state;
  }

  async submitMove(userId: string, gameId: string, input: string): Promise<SubmitMoveResponse> {
    const game = await this.findOwnedGame(userId, gameId);
    if (game.status === "finished") throw new GameAlreadyFinishedException();

    const sans = game.moves.map((move) => move.san);
    const board = this.chess.replay(sans);
    if (board.turn() !== colorToSide(game.color)) throw new NotYourTurnException();

    let applied: AppliedMove;
    try {
      applied = this.chess.applyMove(sans, input);
    } catch (error) {
      if (error instanceof IllegalMoveError) {
        const updated = await this.prisma.game.update({
          where: { id: gameId },
          data: { illegalCount: { increment: 1 } },
          select: { illegalCount: true },
        });
        throw new IllegalMoveException(updated.illegalCount);
      }
      throw error;
    }

    const nextPly = sans.length + 1;
    const boardAfterHuman = this.chess.replay([...sans, applied.san]);
    const outcome = this.chess.getOutcome(boardAfterHuman);

    await this.prisma.move.create({ data: { gameId, ply: nextPly, san: applied.san } });

    if (outcome) {
      const state = await this.finishGame(gameId, game.color, outcome, nextPly);
      return { ...state, accepted: applied.san, aiMove: null };
    }

    await this.prisma.game.update({ where: { id: gameId }, data: { moveCount: nextPly } });

    const { state, aiMove } = await this.playAiMove(
      gameId,
      game.color,
      game.difficulty,
      [...sans, applied.san],
      nextPly,
    );
    return { ...state, accepted: applied.san, aiMove };
  }

  async retryAiMove(userId: string, gameId: string): Promise<SubmitMoveResponse> {
    const game = await this.findOwnedGame(userId, gameId);
    const sans = game.moves.map((move) => move.san);

    if (game.status === "finished") {
      return { ...this.deriveState(game).state, accepted: sans[sans.length - 1] ?? null, aiMove: null };
    }

    const board = this.chess.replay(sans);
    const aiSide = colorToSide(game.color) === "w" ? "b" : "w";
    if (board.turn() !== aiSide) throw new NotAiTurnException();

    const { state, aiMove } = await this.playAiMove(gameId, game.color, game.difficulty, sans, sans.length);
    return { ...state, accepted: sans[sans.length - 1] ?? null, aiMove };
  }

  async resign(userId: string, gameId: string): Promise<ResignResponse> {
    const game = await this.findOwnedGame(userId, gameId);
    if (game.status === "finished") throw new GameAlreadyFinishedException();

    const updated = await this.prisma.game.update({
      where: { id: gameId },
      data: { status: "finished", result: "loss", endedReason: "resign", endedAt: new Date() },
    });

    return {
      id: updated.id,
      status: updated.status,
      result: updated.result!,
      endedReason: updated.endedReason!,
      moveCount: updated.moveCount,
      illegalCount: updated.illegalCount,
      endedAt: updated.endedAt!.toISOString(),
    };
  }
}
