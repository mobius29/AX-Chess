import { Matches } from "class-validator";

export class NicknameDto {
  @Matches(/^[a-zA-Z0-9가-힣_]{2,16}$/)
  nickname!: string;
}
