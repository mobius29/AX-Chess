import { createHash, createHmac, randomBytes } from "node:crypto";

import type { OAuthProvider } from "@ax-chess/shared";
import { HttpException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import argon2 from "argon2";
import { isEmail } from "class-validator";
import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";

import { Prisma } from "../../../generated/prisma/client";
import { PrismaService } from "../../prisma.service";
import type { JwtPayload } from "../auth.decorator";
import { AuthService } from "../auth.service";

interface Identity {
  id: string;
  email: string;
  nickname: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const oauthError = (code = "OAUTH_FAILED", status = 400) =>
  new HttpException({ code, message: "소셜 로그인을 완료하지 못했습니다." }, status);

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly jwt: JwtService,
  ) {
    for (const provider of this.providers()) this.settings(provider);
  }

  providers(): OAuthProvider[] {
    return (["google", "kakao"] as const).filter(
      (provider) => this.config.get(`${provider.toUpperCase()}_OAUTH_ENABLED`) === "true",
    );
  }

  private settings(provider: string) {
    if (!this.providers().includes(provider as OAuthProvider)) throw oauthError("OAUTH_DISABLED", 404);
    const required = (name: string) => {
      const value = this.config.get<string>(name)?.trim();
      if (!value) throw new Error(`${name} is required when OAuth is enabled.`);
      return value;
    };
    const prefix = provider.toUpperCase();
    const web = new URL(required("WEB_URL"));
    if (
      web.pathname !== "/" ||
      web.search ||
      web.hash ||
      web.username ||
      web.password ||
      !["http:", "https:"].includes(web.protocol) ||
      (this.config.get("NODE_ENV") === "production" && web.protocol !== "https:")
    ) {
      throw new Error("WEB_URL must be an origin (HTTPS in production).");
    }
    if (
      required("OAUTH_BFF_SECRET").length < 32 ||
      this.config.get("OAUTH_BFF_SECRET") === this.config.get("JWT_SECRET")
    ) {
      throw new Error("OAUTH_BFF_SECRET must have at least 32 characters and differ from JWT_SECRET.");
    }
    const redirectUri = required(`${prefix}_REDIRECT_URI`);
    if (redirectUri !== `${web.origin}/api/auth/oauth/${provider}/callback`) {
      throw new Error(`${prefix}_REDIRECT_URI must match WEB_URL and the provider callback path.`);
    }
    return {
      clientId: required(provider === "google" ? "GOOGLE_CLIENT_ID" : "KAKAO_REST_API_KEY"),
      clientSecret: required(`${prefix}_CLIENT_SECRET`),
      redirectUri,
    };
  }

  private linkSecret() {
    return createHmac("sha256", this.config.getOrThrow<string>("OAUTH_BFF_SECRET"))
      .update("oauth-link-ticket")
      .digest("hex");
  }

  async start(provider: string, state: string, codeVerifier: string, currentUser?: JwtPayload, password?: string) {
    const settings = this.settings(provider);
    let linkTicket: string | undefined;
    if (currentUser) {
      const user = await this.prisma.user.findUnique({ where: { id: currentUser.sub } });
      if (!user) throw oauthError("UNAUTHORIZED", 401);
      if (user.passwordHash) {
        if (!password || !(await argon2.verify(user.passwordHash, password)))
          throw oauthError("INVALID_CREDENTIALS", 400);
      } else if (
        !currentUser.oauthAuthenticatedAt ||
        currentUser.oauthAuthenticatedAt < Date.now() - 10 * 60_000 ||
        currentUser.oauthAuthenticatedAt > Date.now()
      ) {
        throw oauthError("OAUTH_REAUTH_REQUIRED", 403);
      }
      linkTicket = this.jwt.sign(
        { sub: user.id, provider, state },
        {
          secret: this.linkSecret(),
          algorithm: "HS256",
          audience: "oauth-link",
          expiresIn: "10m",
        },
      );
    }

    const authorizationUrl =
      provider === "google"
        ? new OAuth2Client(settings.clientId, settings.clientSecret, settings.redirectUri).generateAuthUrl({
            scope: ["openid", "email", "profile"],
            state,
            code_challenge: createHash("sha256").update(codeVerifier).digest("base64url"),
            code_challenge_method: CodeChallengeMethod.S256,
            prompt: "select_account",
          })
        : `https://kauth.kakao.com/oauth/authorize?${new URLSearchParams({
            client_id: settings.clientId,
            redirect_uri: settings.redirectUri,
            response_type: "code",
            scope: "account_email,profile_nickname",
            state,
          })}`;
    return { authorizationUrl, linkTicket };
  }

  async complete(
    provider: string,
    input: { code: string; codeVerifier: string; state: string; linkTicket?: string },
    currentUser?: JwtPayload,
  ) {
    const started = Date.now();
    try {
      this.settings(provider);
      if (currentUser) {
        const ticket = this.jwt.verify(input.linkTicket ?? "", {
          secret: this.linkSecret(),
          algorithms: ["HS256"],
          audience: "oauth-link",
        });
        if (ticket.sub !== currentUser.sub || ticket.provider !== provider || ticket.state !== input.state)
          throw oauthError();
      } else if (input.linkTicket) throw oauthError();

      const identity = await this.identity(provider, input.code, input.codeVerifier);
      const user = currentUser
        ? await this.link(provider, identity, currentUser.sub)
        : await this.resolveUser(provider, identity);
      const result = currentUser
        ? { linked: true }
        : {
            ...(await this.auth.issueTokens(user, Date.now())),
            user: { id: user.id, nickname: user.nickname },
          };
      this.logger.log(`${provider} ${currentUser ? "linked" : "login"} ${Date.now() - started}ms`);
      return result;
    } catch (error) {
      const safeError = error instanceof HttpException ? error : oauthError();
      this.logger.warn(
        `${provider === "google" ? "google" : "kakao"} ${JSON.stringify(safeError.getResponse())} ${Date.now() - started}ms`,
      );
      throw safeError;
    }
  }

  private async identity(provider: string, code: string, codeVerifier: string): Promise<Identity> {
    const settings = this.settings(provider);
    if (provider === "google") {
      const client = new OAuth2Client({
        clientId: settings.clientId,
        clientSecret: settings.clientSecret,
        redirectUri: settings.redirectUri,
        transporterOptions: {
          timeout: 10_000,
          retry: false,
          retryConfig: { retry: 0 },
          signal: AbortSignal.timeout(20_000),
        },
      });
      const { tokens } = await client.getToken({ code, codeVerifier });
      if (!tokens.id_token) throw oauthError();
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: settings.clientId });
      const payload = ticket.getPayload();
      if (!payload?.sub) throw oauthError();
      if (payload.email_verified !== true || !payload.email || !isEmail(payload.email))
        throw oauthError("OAUTH_EMAIL_REQUIRED");
      return { id: payload.sub, email: payload.email, nickname: payload.name ?? "player" };
    }
    const response = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: settings.clientId,
        client_secret: settings.clientSecret,
        redirect_uri: settings.redirectUri,
        code,
      }),
    });
    if (!response.ok) throw oauthError();
    const tokens = await response.json();
    if (!isRecord(tokens) || typeof tokens.access_token !== "string" || !tokens.access_token) throw oauthError();
    const profile = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!profile.ok) throw oauthError();
    // Node 24 preserves the original JSON number text, including 64-bit Kakao IDs.
    const data: unknown = JSON.parse(await profile.text(), (key, value, context?: { source: string }) =>
      key === "id" && typeof value === "number" ? context?.source : value,
    );
    if (!isRecord(data) || typeof data.id !== "string" || !/^[1-9]\d*$/.test(data.id)) throw oauthError();
    const account = data.kakao_account;
    if (
      !isRecord(account) ||
      account.is_email_valid !== true ||
      account.is_email_verified !== true ||
      typeof account.email !== "string" ||
      !isEmail(account.email)
    )
      throw oauthError("OAUTH_EMAIL_REQUIRED");
    return {
      id: String(data.id),
      email: account.email,
      nickname:
        isRecord(account.profile) && typeof account.profile.nickname === "string" ? account.profile.nickname : "player",
    };
  }

  private async resolveUser(provider: string, identity: Identity) {
    /* oxlint-disable no-await-in-loop -- Retry only after a unique conflict, re-reading the winning account first. */
    for (let attempt = 0; attempt < 3; attempt++) {
      const account = await this.prisma.oAuthAccount.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId: identity.id } },
        include: { user: true },
      });
      if (account) return account.user;
      if (await this.prisma.user.findUnique({ where: { email: identity.email } }))
        throw oauthError("ACCOUNT_LINK_REQUIRED", 409);
      const prefix = identity.nickname.replace(/[^a-zA-Z0-9가-힣_]/g, "").slice(0, 9) || "player";
      try {
        return await this.prisma.user.create({
          data: {
            email: identity.email,
            nickname: `${prefix}_${randomBytes(3).toString("hex")}`,
            oauthAccounts: { create: { provider, providerAccountId: identity.id } },
          },
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      }
    }
    throw oauthError();
    /* oxlint-enable no-await-in-loop */
  }

  private async link(provider: string, identity: Identity, userId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user || user.email !== identity.email) throw oauthError("ACCOUNT_LINK_CONFLICT", 409);
        const existing = await tx.oAuthAccount.findUnique({ where: { userId_provider: { userId, provider } } });
        if (existing?.providerAccountId === identity.id) return user;
        if (existing) throw oauthError("ACCOUNT_LINK_CONFLICT", 409);
        await tx.oAuthAccount.create({ data: { userId, provider, providerAccountId: identity.id } });
        return user;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        throw oauthError("ACCOUNT_LINK_CONFLICT", 409);
      throw error;
    }
  }
}
