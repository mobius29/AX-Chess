import type { OAuthProvider } from "@ax-chess/shared";
import { HttpException, Injectable, Logger } from "@nestjs/common";

import { OAuthConfigService } from "../../config/oauth-config.service";
import type { JwtPayload } from "../auth.decorator";
import { AuthService } from "../auth.service";
import type { OAuthCallbackDto } from "./dtos/oauth-callback.dto";
import { oauthError } from "./exceptions/oauth.exception";
import { OAuthAccountsService } from "./oauth-accounts.service";
import { OAuthLinkService } from "./oauth-link.service";
import { getOAuthProvider, oauthProviders } from "./oauth.providers";

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly config: OAuthConfigService,
    private readonly accounts: OAuthAccountsService,
    private readonly auth: AuthService,
    private readonly linkTickets: OAuthLinkService,
  ) {}

  providers(): OAuthProvider[] {
    return this.config.providers();
  }

  async start(provider: string, state: string, codeVerifier: string, currentUser?: JwtPayload, password?: string) {
    const settings = this.config.settings(provider);
    const linkTicket = currentUser ? await this.linkTickets.create(provider, state, currentUser, password) : undefined;

    return { authorizationUrl: getOAuthProvider(provider).authorizationUrl(settings, state, codeVerifier), linkTicket };
  }

  async complete(provider: string, input: OAuthCallbackDto, currentUser?: JwtPayload) {
    const started = Date.now();
    try {
      const settings = this.config.settings(provider);
      this.linkTickets.verify(provider, input, currentUser);

      const identity = await getOAuthProvider(provider).identity(settings, input.code, input.codeVerifier);
      if (currentUser) {
        await this.accounts.link(provider, identity, currentUser.sub);
        this.logger.log(`${provider} linked ${Date.now() - started}ms`);
        return { linked: true };
      }

      const user = await this.accounts.resolveUser(provider, identity);
      const tokens = await this.auth.issueTokens(user, Date.now());
      this.logger.log(`${provider} login ${Date.now() - started}ms`);
      return { ...tokens, user: { id: user.id, nickname: user.nickname } };
    } catch (error) {
      const safeError = error instanceof HttpException ? error : oauthError();
      this.logger.warn(
        `${oauthProviders.has(provider as OAuthProvider) ? provider : "unknown"} ${JSON.stringify(safeError.getResponse())} ${Date.now() - started}ms`,
      );
      throw safeError;
    }
  }
}
