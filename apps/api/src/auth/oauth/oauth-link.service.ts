import { createHmac } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import argon2 from "argon2";

import { PrismaService } from "../../prisma.service";
import type { JwtPayload } from "../auth.decorator";
import type { OAuthCallbackDto } from "./dtos/oauth-callback.dto";
import { oauthError } from "./exceptions/oauth.exception";
import { isRecentOAuthAuthentication } from "./utils/validation";

@Injectable()
export class OAuthLinkService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private linkSecret() {
    return createHmac("sha256", this.config.getOrThrow<string>("OAUTH_BFF_SECRET"))
      .update("oauth-link-ticket")
      .digest("hex");
  }

  async create(provider: string, state: string, currentUser: JwtPayload, password?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: currentUser.sub } });
    if (!user) throw oauthError("UNAUTHORIZED", 401);

    if (user.passwordHash) {
      if (!password || !(await argon2.verify(user.passwordHash, password)))
        throw oauthError("INVALID_CREDENTIALS", 400);
    } else if (!isRecentOAuthAuthentication(currentUser.oauthAuthenticatedAt, Date.now())) {
      throw oauthError("OAUTH_REAUTH_REQUIRED", 403);
    }

    return this.jwt.sign(
      { sub: user.id, provider, state },
      { secret: this.linkSecret(), algorithm: "HS256", audience: "oauth-link", expiresIn: "10m" },
    );
  }

  verify(provider: string, input: OAuthCallbackDto, currentUser?: JwtPayload) {
    if (!currentUser) {
      if (input.linkTicket) throw oauthError();
      return;
    }
    const ticket = this.jwt.verify(input.linkTicket ?? "", {
      secret: this.linkSecret(),
      algorithms: ["HS256"],
      audience: "oauth-link",
    });
    const matchesRequest =
      ticket.sub === currentUser.sub && ticket.provider === provider && ticket.state === input.state;
    if (!matchesRequest) throw oauthError();
  }
}
