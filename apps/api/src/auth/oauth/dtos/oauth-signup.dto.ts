import { IsString, MaxLength, MinLength } from "class-validator";

import { NicknameDto } from "../../dtos/nickname.dto";

export class OAuthSignupDto extends NicknameDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  signupTicket!: string;
}
