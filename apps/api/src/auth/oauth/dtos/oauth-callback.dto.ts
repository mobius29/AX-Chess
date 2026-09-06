import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

import { OAuthStartDto } from "./oauth-start.dto";

export class OAuthCallbackDto extends OAuthStartDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  linkTicket?: string;
}
