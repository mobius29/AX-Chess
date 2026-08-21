import type { Color, GameStateDto } from "@ax-chess/shared";

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
