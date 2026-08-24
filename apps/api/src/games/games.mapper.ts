import type {
  Color,
  EndedReason,
  GameResult,
  GameStateDto,
  GameSummaryDto,
  MoveClassification,
  ReviewPlyDto,
  ReviewResponse,
} from "@ax-chess/shared";

import type { Game } from "../../generated/prisma/client";
import { GameDataIntegrityException } from "./games.errors";

export interface GameStateInput {
  game: Game;
  moves: string[];
  turn: Color | null;
  inCheck: boolean;
}

export function toGameStateDto({ game, moves, turn, inCheck }: GameStateInput): GameStateDto {
  return {
    id: game.id,
    color: game.color,
    difficulty: game.difficulty,
    status: game.status,
    turn,
    moves,
    moveCount: game.moveCount,
    illegalCount: game.illegalCount,
    inCheck,
    result: game.result,
    endedReason: game.endedReason,
    createdAt: game.createdAt.toISOString(),
    endedAt: game.endedAt?.toISOString() ?? null,
  };
}

export function assertFinishedFields(
  game: Game,
): asserts game is Game & { result: GameResult; endedReason: EndedReason; endedAt: Date } {
  if (!game.result || !game.endedReason || !game.endedAt) {
    throw new GameDataIntegrityException(`종료된 게임 ${game.id}에 result/endedReason/endedAt이 비어 있습니다.`);
  }
}

function computeAccuracy(game: Game): number {
  const denominator = game.moveCount + game.illegalCount;
  if (denominator === 0) return 1;

  return Math.round((game.moveCount / denominator) * 1000) / 1000;
}

export function toGameSummaryDto(game: Game): GameSummaryDto {
  assertFinishedFields(game);

  return {
    id: game.id,
    result: game.result,
    endedReason: game.endedReason,
    difficulty: game.difficulty,
    color: game.color,
    moveCount: game.moveCount,
    illegalCount: game.illegalCount,
    accuracy: computeAccuracy(game),
    endedAt: game.endedAt.toISOString(),
  };
}

export interface ReviewAnalysisRow {
  ply: number;
  evalCp: number; // blindfold-ok: 복기 전용
  classification: MoveClassification;
  analyzedAt: Date;
}

export function requireAt<T>(arr: T[], index: number, gameId: string): T {
  const value = arr[index];
  if (value === undefined) {
    throw new GameDataIntegrityException(`게임 ${gameId} 복기 데이터 길이가 어긋났습니다 (index ${index}).`);
  }
  return value;
}

export function toReviewResponse(
  game: Game & { moves: { san: string }[] },
  initialFen: string,
  fens: string[],
  analysis: ReviewAnalysisRow[],
): ReviewResponse {
  assertFinishedFields(game);

  const plies: ReviewPlyDto[] = game.moves.map((move, index) => {
    const row = requireAt(analysis, index, game.id);

    return {
      ply: index + 1,
      san: move.san,
      side: index % 2 === 0 ? "white" : "black",
      fen: requireAt(fens, index, game.id), // blindfold-ok: status=finished 게이트 뒤에서만 발급된다
      evalCp: row.evalCp, // blindfold-ok: 복기 전용
      classification: row.classification,
    };
  });

  return {
    gameId: game.id,
    color: game.color,
    result: game.result,
    endedReason: game.endedReason,
    initialFen, // blindfold-ok: 복기 전용 초기 포지션
    plies,
    analyzedAt: (analysis[0]?.analyzedAt ?? new Date()).toISOString(),
  };
}
