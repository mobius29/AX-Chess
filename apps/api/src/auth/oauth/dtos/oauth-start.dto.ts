import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class OAuthStartDto {
  @Matches(/^[a-zA-Z0-9_-]{43,128}$/)
  state!: string;

  @Matches(/^[a-zA-Z0-9_-]{43,128}$/)
  codeVerifier!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  password?: string;
}
