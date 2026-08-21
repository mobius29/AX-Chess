import type { Color, Difficulty, EndedReason, GameResult } from "@ax-chess/shared";

export const COLOR_LABEL: Record<Color, string> = { white: "백", black: "흑" };

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "쉬움", normal: "보통", hard: "어려움" };

export const RESULT_LABEL: Record<GameResult, string> = { win: "승리", loss: "패배", draw: "무승부" };

export const ENDED_REASON_LABEL: Record<EndedReason, string> = {
  checkmate: "체크메이트",
  stalemate: "스테일메이트",
  resign: "기권",
  fifty_move: "50수 규칙",
  threefold: "3회 반복",
  insufficient_material: "기물 부족",
};
