import type { Color, Difficulty, EndedReason, GameResult, MoveClassification } from "@ax-chess/shared";

export const COLOR_LABEL: Record<Color, string> = { white: "백", black: "흑" };

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "쉬움", normal: "보통", hard: "어려움" };

export const RESULT_LABEL: Record<GameResult, string> = { win: "승리", loss: "패배", draw: "무승부" };

export const RESULT_BADGE_CLASS: Record<GameResult, string> = {
  win: "bg-success/15 text-success",
  loss: "bg-error/15 text-error",
  draw: "bg-warning/15 text-warning",
};

export const MOVE_CLASSIFICATION_LABEL: Record<MoveClassification, string> = {
  good: "좋은 수",
  inaccuracy: "부정확",
  mistake: "실수",
  blunder: "블런더",
};

export const MOVE_CLASSIFICATION_BADGE_CLASS: Record<MoveClassification, string> = {
  good: "bg-success/15 text-success",
  inaccuracy: "bg-accent-amber/15 text-accent-amber",
  mistake: "bg-warning/15 text-warning",
  blunder: "bg-error/15 text-error",
};

export const MOVE_CLASSIFICATION_DOT_CLASS: Record<MoveClassification, string> = {
  good: "bg-success",
  inaccuracy: "bg-accent-amber",
  mistake: "bg-warning",
  blunder: "bg-error",
};

export const ENDED_REASON_LABEL: Record<EndedReason, string> = {
  checkmate: "체크메이트",
  stalemate: "스테일메이트",
  resign: "기권",
  fifty_move: "50수 규칙",
  threefold: "3회 반복",
  insufficient_material: "기물 부족",
};
