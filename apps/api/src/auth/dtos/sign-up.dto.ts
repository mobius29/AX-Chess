import { IsEmail, MinLength } from "class-validator";

import { NicknameDto } from "./nickname.dto";

export class SignUpRequestDTO extends NicknameDto {
  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;
}
