import { Module } from "@nestjs/common";

import { OAuthConfigService } from "../config/oauth-config.service";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { OAuthAccountsService } from "./oauth/oauth-accounts.service";
import { OAuthBffGuard } from "./oauth/oauth-bff.guard";
import { OAuthLinkService } from "./oauth/oauth-link.service";
import { OAuthController } from "./oauth/oauth.controller";
import { OAuthService } from "./oauth/oauth.service";

@Module({
  controllers: [AuthController, OAuthController],
  providers: [
    AuthService,
    AuthGuard,
    OAuthService,
    OAuthBffGuard,
    OAuthConfigService,
    OAuthAccountsService,
    OAuthLinkService,
  ],
})
export class AuthModule {}
