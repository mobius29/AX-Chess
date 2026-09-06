import { timingSafeEqual } from "node:crypto";

import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  HttpCode,
  Injectable,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { CurrentUser } from "../auth.decorator";
import type { JwtPayload } from "../auth.decorator";
import { AuthGuard } from "../auth.guard";
import { OAuthCallbackDto } from "./dtos/oauth-callback.dto";
import { OAuthStartDto } from "./dtos/oauth-start.dto";
import { oauthError } from "./exceptions/oauth.exception";
import { OAuthService } from "./oauth.service";

@Injectable()
export class OAuthBffGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const actual = context.switchToHttp().getRequest().headers["x-oauth-bff-secret"];
    const expected = this.config.get<string>("OAUTH_BFF_SECRET");
    if (
      !expected ||
      typeof actual !== "string" ||
      Buffer.byteLength(actual) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
    )
      throw oauthError("FORBIDDEN", 403);
    return true;
  }
}

@Controller("auth/oauth")
@UseGuards(OAuthBffGuard)
export class OAuthController {
  constructor(private readonly oauth: OAuthService) {}

  @Get("providers")
  providers() {
    return this.oauth.providers();
  }

  @Post(":provider/start")
  @HttpCode(200)
  start(@Param("provider") provider: string, @Body() body: OAuthStartDto) {
    return this.oauth.start(provider, body.state, body.codeVerifier);
  }

  @Post(":provider/link/start")
  @HttpCode(200)
  @UseGuards(AuthGuard)
  startLink(@Param("provider") provider: string, @Body() body: OAuthStartDto, @CurrentUser() user: JwtPayload) {
    return this.oauth.start(provider, body.state, body.codeVerifier, user, body.password);
  }

  @Post(":provider/callback")
  @HttpCode(200)
  callback(@Param("provider") provider: string, @Body() body: OAuthCallbackDto) {
    return this.oauth.complete(provider, body);
  }

  @Post(":provider/link")
  @HttpCode(200)
  @UseGuards(AuthGuard)
  link(@Param("provider") provider: string, @Body() body: OAuthCallbackDto, @CurrentUser() user: JwtPayload) {
    return this.oauth.complete(provider, body, user);
  }
}
