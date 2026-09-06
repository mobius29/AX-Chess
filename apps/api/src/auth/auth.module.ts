import { Module } from "@nestjs/common";

import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { OAuthBffGuard, OAuthController } from "./oauth/oauth.controller";
import { OAuthService } from "./oauth/oauth.service";

@Module({
  controllers: [AuthController, OAuthController],
  providers: [AuthService, AuthGuard, OAuthService, OAuthBffGuard],
})
export class AuthModule {}
