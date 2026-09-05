import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../auth.decorator";
import type { JwtPayload } from "../auth.decorator";
import { AuthGuard } from "../auth.guard";
import { OAuthCallbackDto } from "./dtos/oauth-callback.dto";
import { OAuthSignupDto } from "./dtos/oauth-signup.dto";
import { OAuthStartDto } from "./dtos/oauth-start.dto";
import { OAuthBffGuard } from "./oauth-bff.guard";
import { OAuthService } from "./oauth.service";

@Controller("auth/oauth")
@UseGuards(OAuthBffGuard)
export class OAuthController {
  constructor(private readonly oauth: OAuthService) {}

  @Get("providers")
  providers() {
    return this.oauth.providers();
  }

  @Post("signup")
  @HttpCode(200)
  completeSignup(@Body() body: OAuthSignupDto) {
    return this.oauth.completeSignup(body);
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
