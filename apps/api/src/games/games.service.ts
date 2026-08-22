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

type Db = PrismaService | Prisma.TransactionClient;

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
    const game = await this.prisma.game.findUnique({ where: { id: gameId }, include: { moves: MOVES_ORDER_BY_PLY } });
    if (!game) throw new GameNotFoundException();
    if (game.userId !== userId) throw new GameForbiddenException();

    return game;
  }

  private deriveState(game: Game & { moves: { san: string }[] }): {
    board: Chess;
    state: ReturnType<typeof toGameStateDto>;
  } {
    const sans = game.moves.map(({ san }) => san);
    const board = this.chess.replay(sans);

    return {
      board,
      state: toGameStateDto({
        game,
        moves: sans,
        turn: game.status === "finished" ? null : board.turn() === "w" ? "white" : "black",
        inCheck: game.status === "active" && board.inCheck(),
      }),
    };
  }

  private async finishGame(db: Db, gameId: string, humanColor: Color, outcome: Outcome, moveCount: number) {
    const result: GameResult =
      outcome.winner === null ? "draw" : outcome.winner === colorToSide(humanColor) ? "win" : "loss";

    const game = await db.game.update({
      where: { id: gameId },
      data: { status: "finished", result, endedReason: outcome.reason, moveCount, endedAt: new Date() },
      include: { moves: MOVES_ORDER_BY_PLY },
    });

    return this.deriveState(game).state;
  }

  private async computeAiReply(sans: string[], difficulty: Difficulty) {
    try {
      const bestMoveUci = await this.engine.bestMove(sans, difficulty);
      const applied = this.chess.applyMove(sans, bestMoveUci);
      const outcome = this.chess.getOutcome(this.chess.replay([...sans, applied.san]));

      return { applied, outcome };
    } catch (error) {
      if (error instanceof EngineUnavailableError) throw new EngineUnavailableException();
      throw error;
    }
  }

  private async persistAiReply(
    db: Db,
    gameId: string,
    humanColor: Color,
    applied: AppliedMove,
    outcome: Outcome | null,
    nextPly: number,
  ) {
    await db.move.create({ data: { gameId, ply: nextPly, san: applied.san } });

    if (outcome) {
      return { state: await this.finishGame(db, gameId, humanColor, outcome, nextPly), aiMove: applied.san };
    }

    const game = await db.game.update({
      where: { id: gameId },
      data: { moveCount: nextPly },
      include: { moves: MOVES_ORDER_BY_PLY },
    });

    return { state: this.deriveState(game).state, aiMove: applied.san };
  }

  async createGame(userId: string, color: ColorChoice, difficulty: Difficulty) {
    const resolvedColor: Color = color === "random" ? (Math.random() < 0.5 ? "white" : "black") : color;

    if (resolvedColor !== "black") {
      try {
        const game = await this.prisma.game.create({ data: { userId, color: resolvedColor, difficulty } });
        return this.deriveState({ ...game, moves: [] }).state;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new ActiveGameExistsException();
        }
        throw error;
      }
    }

    const { applied, outcome } = await this.computeAiReply([], difficulty);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const game = await tx.game.create({ data: { userId, color: resolvedColor, difficulty } });
        const { state } = await this.persistAiReply(tx, game.id, resolvedColor, applied, outcome, 1);
        return state;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ActiveGameExistsException();
      }
      throw error;
    }
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
    const humanOutcome = this.chess.getOutcome(this.chess.replay([...sans, applied.san]));

    if (humanOutcome) {
      const state = await this.prisma.$transaction(async (tx) => {
        await tx.move.create({ data: { gameId, ply: nextPly, san: applied.san } });
        return this.finishGame(tx, gameId, game.color, humanOutcome, nextPly);
      });
      return { ...state, accepted: applied.san, aiMove: null };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.move.create({ data: { gameId, ply: nextPly, san: applied.san } });
      await tx.game.update({ where: { id: gameId }, data: { moveCount: nextPly } });
    });

    const { applied: aiApplied, outcome: aiOutcome } = await this.computeAiReply(
      [...sans, applied.san],
      game.difficulty,
    );
    const { state, aiMove } = await this.prisma.$transaction((tx) =>
      this.persistAiReply(tx, gameId, game.color, aiApplied, aiOutcome, nextPly + 1),
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

    if (board.turn() !== aiSide) {
      if (sans.length === 0) throw new NotAiTurnException();
      return {
        ...this.deriveState(game).state,
        accepted: sans[sans.length - 2] ?? null,
        aiMove: sans[sans.length - 1] ?? null,
      };
    }

    const { applied, outcome } = await this.computeAiReply(sans, game.difficulty);
    const { state, aiMove } = await this.prisma.$transaction((tx) =>
      this.persistAiReply(tx, gameId, game.color, applied, outcome, sans.length + 1),
    );

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
