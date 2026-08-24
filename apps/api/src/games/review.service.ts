import type { MoveClassification, ReviewResponse } from "@ax-chess/shared";
import { Injectable } from "@nestjs/common";

import { ChessService } from "../chess/chess.service";
import { ANALYSIS_TIME_MS, EngineService, EngineUnavailableError } from "../engine/engine.service";
import { PrismaService } from "../prisma.service";
import { EngineUnavailableException, GameNotFinishedException } from "./games.errors";
import { ReviewAnalysisRow, toReviewResponse } from "./games.mapper";
import { GamesService } from "./games.service";

const BLUNDER_CP_LOSS = 200;
const MISTAKE_CP_LOSS = 100;
const INACCURACY_CP_LOSS = 50;

function classify(cpLoss: number): MoveClassification {
  if (cpLoss >= BLUNDER_CP_LOSS) return "blunder";
  if (cpLoss >= MISTAKE_CP_LOSS) return "mistake";
  if (cpLoss >= INACCURACY_CP_LOSS) return "inaccuracy";
  return "good";
}

@Injectable()
export class ReviewService {
  private readonly pendingRecompute = new Map<string, Promise<ReviewAnalysisRow[]>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly chess: ChessService,
    private readonly engine: EngineService,
    private readonly games: GamesService,
  ) {}

  async getReview(userId: string, gameId: string): Promise<ReviewResponse> {
    const game = await this.games.findOwnedGame(userId, gameId);
    if (game.status !== "finished") throw new GameNotFinishedException();

    const sans = game.moves.map((move) => move.san);
    const fens = this.chess.replayWithFens(sans);

    let analysis: ReviewAnalysisRow[] = await this.prisma.gameAnalysis.findMany({
      where: { gameId },
      orderBy: { ply: "asc" },
    });

    if (analysis.length !== sans.length) {
      analysis = await this.getOrRecompute(gameId, sans);
    }

    return toReviewResponse(game, this.chess.initialFen(), fens, analysis);
  }

  private getOrRecompute(gameId: string, sans: string[]): Promise<ReviewAnalysisRow[]> {
    const pending = this.pendingRecompute.get(gameId);
    if (pending) return pending;

    const task = this.recompute(gameId, sans);
    this.pendingRecompute.set(gameId, task);
    task.finally(() => this.pendingRecompute.delete(gameId)).catch(() => undefined);
    return task;
  }

  private async recompute(gameId: string, sans: string[]): Promise<ReviewAnalysisRow[]> {
    let evaluations: { ply: number; evalCp: number }[];
    try {
      evaluations = await this.engine.evaluate(sans, ANALYSIS_TIME_MS);
    } catch (error) {
      if (error instanceof EngineUnavailableError) throw new EngineUnavailableException();
      throw error;
    }

    const analyzedAt = new Date();
    const rows: ReviewAnalysisRow[] = [];
    let previousEvalCp = 0;

    for (const { ply, evalCp } of evaluations) {
      const side = ply % 2 === 1 ? 1 : -1;
      rows.push({ ply, evalCp, classification: classify((previousEvalCp - evalCp) * side), analyzedAt });
      previousEvalCp = evalCp;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.gameAnalysis.deleteMany({ where: { gameId } });
      await tx.gameAnalysis.createMany({
        data: rows.map((row) => ({ gameId, ...row })),
      });
    });

    return rows;
  }
}
