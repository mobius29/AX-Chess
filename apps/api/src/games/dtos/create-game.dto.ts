import type { ColorChoice, Difficulty } from "@ax-chess/shared";
import { IsIn } from "class-validator";

const COLOR_CHOICES: ColorChoice[] = ["white", "black", "random"];
const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard"];

export class CreateGameRequestDTO {
  @IsIn(COLOR_CHOICES)
  color!: ColorChoice;

  @IsIn(DIFFICULTIES)
  difficulty!: Difficulty;
}
