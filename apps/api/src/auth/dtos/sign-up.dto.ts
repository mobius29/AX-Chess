import { IsEmail, Matches, MinLength } from "class-validator";

export class SignUpRequestDTO {
  @IsEmail()
  email!: string;

  @Matches(/^[a-zA-Z0-9가-힣_]{2,16}$/)
  nickname!: string;

  @MinLength(8)
  password!: string;
}
