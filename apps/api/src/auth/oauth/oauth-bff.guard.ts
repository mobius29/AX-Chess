import { timingSafeEqual } from "node:crypto";

import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { oauthError } from "./exceptions/oauth.exception";

@Injectable()
export class OAuthBffGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const actual = context.switchToHttp().getRequest().headers["x-oauth-bff-secret"];
    const expected = this.config.get<string>("OAUTH_BFF_SECRET");
    if (!expected || typeof actual !== "string") throw oauthError("FORBIDDEN", 403);

    const actualBytes = Buffer.from(actual);
    const expectedBytes = Buffer.from(expected);
    if (actualBytes.length !== expectedBytes.length) throw oauthError("FORBIDDEN", 403);
    if (!timingSafeEqual(actualBytes, expectedBytes)) throw oauthError("FORBIDDEN", 403);
    return true;
  }
}
