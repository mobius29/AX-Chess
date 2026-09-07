import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import argon2 from "argon2";

import { Prisma } from "../../generated/prisma/client";
import { EnvConfigService } from "../env-config.service";
import { PrismaService } from "../prisma.service";
import type { JwtPayload } from "./auth.decorator";
import { EmailTakenException } from "./exceptions/email-taken.exception";
import { InvalidCredentialException } from "./exceptions/invalid-credential.exception";
import { NicknameTakenException } from "./exceptions/nickname-taken.exception";
import { oauthError } from "./oauth/exceptions/oauth.exception";
import type { Identity } from "./oauth/oauth.providers";
import { isRecentOAuthAuthentication } from "./oauth/utils/validation";

interface TokenUser {
  id: string;
  email: string;
  nickname: string;
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private env: EnvConfigService,
  ) {}

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      select: {
        id: true,
        email: true,
        nickname: true,
        passwordHash: true,
        oauthAccounts: { select: { provider: true } },
      },
      where: { id: userId },
    });
    if (!user) throw new UnauthorizedException({ code: "UNAUTHORIZED", message: "존재하지 않는 사용자입니다." });

    const grouped = await this.prisma.game.groupBy({
      by: ["result"],
      where: { userId: user.id, status: "finished" },
      _count: { _all: true },
      orderBy: { result: "asc" },
    });

    const stats = grouped.reduce(
      (acc, { result, _count: { _all: count } }) => {
        acc.total += count;
        if (result === "win") acc.wins += count;
        if (result === "loss") acc.losses += count;
        if (result === "draw") acc.draws += count;
        return acc;
      },
      { total: 0, wins: 0, losses: 0, draws: 0 },
    );

    const { passwordHash, oauthAccounts, ...profile } = user;
    return {
      ...profile,
      stats,
      hasPassword: Boolean(passwordHash),
      connectedProviders: oauthAccounts.map(({ provider }) => provider),
    };
  }

  async checkNickname(nickname: string) {
    if (await this.prisma.user.findUnique({ where: { nickname } })) throw new NicknameTakenException();
    return { available: true };
  }

  async resolveOAuthUser(provider: string, identity: Identity) {
    const account = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId: identity.id } },
      include: { user: true },
    });
    if (account) return account.user;
    if (await this.prisma.user.findUnique({ where: { email: identity.email } }))
      throw oauthError("ACCOUNT_LINK_REQUIRED", 409);
    return null;
  }

  async createOAuthUser(provider: string, identity: Identity, nickname: string) {
    try {
      return await this.prisma.user.create({
        data: {
          email: identity.email,
          nickname,
          oauthAccounts: { create: { provider, providerAccountId: identity.id } },
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      if (await this.resolveOAuthUser(provider, identity)) throw oauthError("OAUTH_SIGNUP_EXPIRED", 401);
      await this.checkNickname(nickname);
      throw oauthError();
    }
  }

  async linkOAuthAccount(provider: string, identity: Identity, userId: string) {
    const { id, email } = identity;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user || user.email !== email) throw oauthError("ACCOUNT_LINK_CONFLICT", 409);

        const existing = await tx.oAuthAccount.findUnique({ where: { userId_provider: { userId, provider } } });
        if (existing?.providerAccountId === id) return user;

        if (existing) throw oauthError("ACCOUNT_LINK_CONFLICT", 409);

        await tx.oAuthAccount.create({ data: { userId, provider, providerAccountId: id } });
        return user;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        throw oauthError("ACCOUNT_LINK_CONFLICT", 409);

      throw error;
    }
  }

  async verifyAccountOwnership(currentUser: JwtPayload, password?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: currentUser.sub } });
    if (!user) throw oauthError("UNAUTHORIZED", 401);

    if (user.passwordHash) {
      if (!password || !(await argon2.verify(user.passwordHash, password)))
        throw oauthError("INVALID_CREDENTIALS", 400);
    } else if (!isRecentOAuthAuthentication(currentUser.oauthAuthenticatedAt, Date.now())) {
      throw oauthError("OAUTH_REAUTH_REQUIRED", 403);
    }
  }

  async deleteAccount(currentUser: JwtPayload, password?: string) {
    await this.verifyAccountOwnership(currentUser, password);
    const deleted = await this.prisma.user.deleteMany({ where: { id: currentUser.sub } });
    if (deleted.count !== 1) throw this.unauthorized();
  }

  async createUser(email: string, nickname: string, password: string) {
    try {
      return await this.prisma.user.create({
        select: { id: true, email: true, nickname: true, createdAt: true },
        data: { email, nickname, passwordHash: await argon2.hash(password) },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await this.prisma.user.findFirst({
          where: { OR: [{ email }, { nickname }] },
          select: { email: true, nickname: true },
        });

        if (existing?.email === email || existing?.nickname === nickname) throw new EmailTakenException();
      }

      throw error;
    }
  }

  async signIn(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      select: { id: true, email: true, nickname: true, passwordHash: true },
      where: { email },
    });
    if (!user?.passwordHash) throw new InvalidCredentialException();

    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) throw new InvalidCredentialException();

    return { ...(await this.issueTokens(user)), user: { id: user.id, nickname: user.nickname } };
  }

  async refresh(refreshToken: string) {
    const now = new Date();
    const [sessionId, tokenSecret, ...rest] = refreshToken.split(".");
    if (!sessionId || !tokenSecret || rest.length) throw this.unauthorized();

    const session = await this.prisma.refreshSession.findUnique({
      include: { user: { select: { id: true, email: true, nickname: true } } },
      where: { id: sessionId },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= now ||
      !(await argon2.verify(session.tokenHash, tokenSecret))
    ) {
      throw this.unauthorized();
    }

    const replacementSecret = this.newRefreshToken();
    const replacementHash = await argon2.hash(replacementSecret);
    const tokens = await this.prisma.$transaction(async (tx) => {
      const revoked = await tx.refreshSession.updateMany({
        data: { revokedAt: now },
        where: { expiresAt: { gt: now }, id: session.id, revokedAt: null },
      });
      if (revoked.count !== 1) throw this.unauthorized();

      const replacement = await tx.refreshSession.create({
        data: {
          expiresAt: session.expiresAt,
          tokenHash: replacementHash,
          userId: session.userId,
          oauthAuthenticatedAt: session.oauthAuthenticatedAt,
        },
      });

      return this.tokensFor(
        session.user,
        `${replacement.id}.${replacementSecret}`,
        session.expiresAt,
        session.oauthAuthenticatedAt?.getTime(),
      );
    });

    return tokens;
  }

  async signOut(refreshToken?: string) {
    if (!refreshToken) return;
    const [sessionId, tokenSecret, ...rest] = refreshToken.split(".");
    if (!sessionId || !tokenSecret || rest.length) return;

    const session = await this.prisma.refreshSession.findUnique({ where: { id: sessionId } });
    if (!session || !(await argon2.verify(session.tokenHash, tokenSecret))) return;

    await this.prisma.refreshSession.updateMany({
      data: { revokedAt: new Date() },
      where: { id: sessionId, revokedAt: null },
    });
  }

  async issueTokens(user: TokenUser, oauthAuthenticatedAt?: number) {
    const refreshTokenSecret = this.newRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + this.env.refreshTokenTtlMs);
    const session = await this.prisma.refreshSession.create({
      data: {
        expiresAt: refreshExpiresAt,
        tokenHash: await argon2.hash(refreshTokenSecret),
        userId: user.id,
        oauthAuthenticatedAt: oauthAuthenticatedAt === undefined ? null : new Date(oauthAuthenticatedAt),
      },
    });
    return this.tokensFor(user, `${session.id}.${refreshTokenSecret}`, refreshExpiresAt, oauthAuthenticatedAt);
  }

  private tokensFor(user: TokenUser, refreshToken: string, refreshExpiresAt: Date, oauthAuthenticatedAt?: number) {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      ...(oauthAuthenticatedAt && { oauthAuthenticatedAt }),
    });
    const payload = this.jwtService.decode(accessToken);
    if (!payload || typeof payload === "string" || typeof payload.exp !== "number") {
      throw new Error("Access token must include an expiry.");
    }

    return {
      accessExpiresAt: new Date(payload.exp * 1000),
      accessToken,
      refreshExpiresAt,
      refreshToken,
    };
  }

  private newRefreshToken() {
    return globalThis.crypto.randomUUID();
  }

  private unauthorized() {
    return new UnauthorizedException({ code: "UNAUTHORIZED", message: "인증이 필요합니다." });
  }
}
