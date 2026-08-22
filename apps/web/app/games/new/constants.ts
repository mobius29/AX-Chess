import type { ColorChoice, Difficulty } from "@ax-chess/shared";

export const COLOR_CHOICES: { label: string; value: ColorChoice }[] = [
  { label: "백", value: "white" },
  { label: "흑", value: "black" },
  { label: "무작위", value: "random" },
];

export const DIFFICULTY_CHOICES: { label: string; value: Difficulty }[] = [
  { label: "쉬움", value: "easy" },
  { label: "보통", value: "normal" },
  { label: "어려움", value: "hard" },
];
