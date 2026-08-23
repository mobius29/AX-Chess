import type { Color, GameStateDto, GameSummaryDto } from "@ax-chess/shared";

import type { Game } from "../../generated/prisma/client";

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

function userMoveCount(game: Game): number {
  return game.color === "white" ? Math.ceil(game.moveCount / 2) : Math.floor(game.moveCount / 2);
}

function computeAccuracy(game: Game): number {
  const moved = userMoveCount(game);
  const denominator = moved + game.illegalCount;
  if (denominator === 0) return 1;

  return Math.round((moved / denominator) * 1000) / 1000;
}

export function toGameSummaryDto(game: Game): GameSummaryDto {
  const { result, endedReason, endedAt } = game;
  if (!result || !endedReason || !endedAt) {
    throw new Error(`종료된 게임 ${game.id}에 result/endedReason/endedAt이 비어 있습니다.`);
  }

  return {
    id: game.id,
    result,
    endedReason,
    difficulty: game.difficulty,
    color: game.color,
    moveCount: game.moveCount,
    illegalCount: game.illegalCount,
    accuracy: computeAccuracy(game),
    endedAt: endedAt.toISOString(),
  };
}
