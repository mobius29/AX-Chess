import { HttpException } from "@nestjs/common";

export const oauthError = (code = "OAUTH_FAILED", status = 400) =>
  new HttpException({ code, message: "소셜 로그인을 완료하지 못했습니다." }, status);
