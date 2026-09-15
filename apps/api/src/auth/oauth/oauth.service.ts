import { createHmac } from "node:crypto";

import type { OAuthProvider } from "@ax-chess/shared";
import { HttpException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { OAuthConfigService } from "../../config/oauth-config.service";
import type { JwtPayload } from "../auth.decorator";
import { AuthService } from "../auth.service";
import type { OAuthCallbackDto } from "./dtos/oauth-callback.dto";
import type { OAuthSignupDto } from "./dtos/oauth-signup.dto";
import { oauthError } from "./exceptions/oauth.exception";
import { getOAuthProvider, oauthProviders } from "./oauth.providers";
import type { Identity } from "./oauth.providers";

interface SignupTicket {
  provider: string;
  identity: Identity;
  authenticatedAt: number;
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly config: OAuthConfigService,
    private readonly env: ConfigService,
    private readonly auth: AuthService,
    private readonly jwt: JwtService,
  ) {}

  providers(): OAuthProvider[] {
    return this.config.providers();
  }

  async start(provider: string, state: string, codeVerifier: string, currentUser?: JwtPayload, password?: string) {
    const settings = this.config.settings(provider);
    const linkTicket = currentUser ? await this.createLinkTicket(provider, state, currentUser, password) : undefined;

    return { authorizationUrl: getOAuthProvider(provider).authorizationUrl(settings, state, codeVerifier), linkTicket };
  }

  async completeSignup(input: OAuthSignupDto) {
    const { provider, identity, authenticatedAt } = this.verifyTicket<SignupTicket>("signup", input.signupTicket);
    this.config.settings(provider);
    const user = await this.auth.createOAuthUser(provider, identity, input.nickname);
    return { ...(await this.auth.issueTokens(user, authenticatedAt)), user: { id: user.id, nickname: user.nickname } };
  }

  async complete(provider: string, input: OAuthCallbackDto, currentUser?: JwtPayload) {
    const started = Date.now();
    try {
      const settings = this.config.settings(provider);
      this.verifyLinkTicket(provider, input, currentUser);

      const identity = await getOAuthProvider(provider).identity(settings, input.code, input.codeVerifier);
      if (currentUser) {
        await this.auth.linkOAuthAccount(provider, identity, currentUser.sub);
        this.logger.log(`${provider} linked ${Date.now() - started}ms`);
        return { linked: true };
      }

      const user = await this.auth.resolveOAuthUser(provider, identity);
      if (!user)
        return {
          signupRequired: true,
          signupTicket: this.signTicket("signup", { provider, identity, authenticatedAt: Date.now() }),
        };
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

  private ticketOptions(purpose: "link" | "signup") {
    const secret = createHmac("sha256", this.env.getOrThrow<string>("OAUTH_BFF_SECRET"))
      .update(`oauth-${purpose}-ticket`)
      .digest("hex");
    return { secret, audience: `oauth-${purpose}` };
  }

  private signTicket(purpose: "link" | "signup", payload: object) {
    return this.jwt.sign(payload, { ...this.ticketOptions(purpose), algorithm: "HS256", expiresIn: "10m" });
  }

  private verifyTicket<T extends object>(purpose: "link" | "signup", token: string): T {
    try {
      return this.jwt.verify<T>(token, { ...this.ticketOptions(purpose), algorithms: ["HS256"] });
    } catch {
      throw purpose === "signup" ? oauthError("OAUTH_SIGNUP_EXPIRED", 401) : oauthError();
    }
  }

  private async createLinkTicket(provider: string, state: string, currentUser: JwtPayload, password?: string) {
    await this.auth.verifyAccountOwnership(currentUser, password);
    return this.signTicket("link", { sub: currentUser.sub, provider, state });
  }

  private verifyLinkTicket(provider: string, input: OAuthCallbackDto, currentUser?: JwtPayload) {
    if (!currentUser) {
      if (input.linkTicket) throw oauthError();
      return;
    }
    const ticket = this.verifyTicket<{ sub: string; provider: string; state: string }>("link", input.linkTicket ?? "");
    const matchesRequest =
      ticket.sub === currentUser.sub && ticket.provider === provider && ticket.state === input.state;
    if (!matchesRequest) throw oauthError();
  }
}
