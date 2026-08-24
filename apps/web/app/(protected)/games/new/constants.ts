import type { ColorChoice, Difficulty } from "@ax-chess/shared";

export const COLOR_CHOICES: { label: string; value: ColorChoice }[] = [
  { label: "백", value: "white" },
  { label: "흑", value: "black" },
  { label: "랜덤", value: "random" },
];

export const DIFFICULTY_CHOICES: { label: string; sub: string; value: Difficulty }[] = [
  { label: "Easy", sub: "Elo 800", value: "easy" },
  { label: "Normal", sub: "Elo 1100", value: "normal" },
  { label: "Hard", sub: "Elo 1400", value: "hard" },
];
