import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class SubmitMoveRequestDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  move!: string;
}
