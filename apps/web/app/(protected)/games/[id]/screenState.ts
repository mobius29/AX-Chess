import type { Color, GameStatus } from "@ax-chess/shared";

export type ScreenState = "ready" | "submitting" | "engineRetry" | "finished";

export const getScreenState = ({
  status,
  color,
  turn,
  isSubmitting,
}: {
  status: GameStatus;
  color: Color;
  turn: Color | null;
  isSubmitting: boolean;
}): ScreenState => {
  if (status === "finished") return "finished";
  if (isSubmitting) return "submitting";

  return turn !== color ? "engineRetry" : "ready";
};
