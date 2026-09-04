import { createHash, randomBytes } from "crypto";

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import argon2 from "argon2";

import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../prisma.service";
import { EmailTakenException } from "./exceptions/email-taken.exception";
import { InvalidCredentialException } from "./exceptions/invalid-credential.exception";
import { NicknameTakenException } from "./exceptions/nickname-taken.exception";

const DAY_MS = 24 * 60 * 60 * 1000;

interface TokenUser {
  id: string;
  email: string;
  nickname: string;
}

@Injectable()
export class AuthService {
  private readonly refreshTokenTtlMs: number;

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    config: ConfigService,
  ) {
    this.refreshTokenTtlMs = this.refreshTokenTtlMsFrom(config.getOrThrow<string>("REFRESH_TOKEN_TTL_DAYS"));
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      select: { id: true, email: true, nickname: true },
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
      (acc, { result, _count }) => {
        const count = _count._all;
        acc.total += count;
        if (result === "win") acc.wins += count;
        if (result === "loss") acc.losses += count;
        if (result === "draw") acc.draws += count;
        return acc;
      },
      { total: 0, wins: 0, losses: 0, draws: 0 },
    );

    return { ...user, stats };
  }

  async createUser(email: string, nickname: string, password: string) {
    try {
      return await this.prisma.user.create({
        select: { id: true, email: true, nickname: true, createdAt: true },
        data: { email, nickname, passwordHash: await argon2.hash(password) },
      });
    } catch (error) {
      // simulta
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await this.prisma.user.findFirst({
          where: { OR: [{ email }, { nickname }] },
          select: { email: true, nickname: true },
        });

        if (existing?.email === email) throw new EmailTakenException();
        if (existing?.nickname === nickname) throw new NicknameTakenException();
      }

      throw error;
    }
  }

  async signIn(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      select: { id: true, email: true, nickname: true, passwordHash: true },
      where: { email },
    });
    if (!user) throw new InvalidCredentialException();

    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) throw new InvalidCredentialException();

    return { ...(await this.issueTokens(user)), user: { id: user.id, nickname: user.nickname } };
  }

  async refresh(refreshToken: string) {
    const now = new Date();
    const session = await this.prisma.refreshSession.findUnique({
      include: { user: { select: { id: true, email: true, nickname: true } } },
      where: { tokenHash: this.hashRefreshToken(refreshToken) },
    });

    if (!session || session.revokedAt || session.expiresAt <= now) throw this.unauthorized();

    const refreshTokenReplacement = this.newRefreshToken();
    const tokenHash = this.hashRefreshToken(refreshTokenReplacement);
    const tokens = await this.prisma.$transaction(async (tx) => {
      const revoked = await tx.refreshSession.updateMany({
        data: { revokedAt: now },
        where: { expiresAt: { gt: now }, id: session.id, revokedAt: null },
      });
      if (revoked.count !== 1) throw this.unauthorized();

      await tx.refreshSession.create({
        data: { expiresAt: session.expiresAt, tokenHash, userId: session.userId },
      });

      return this.tokensFor(session.user, refreshTokenReplacement, session.expiresAt);
    });

    return tokens;
  }

  async signOut(refreshToken?: string) {
    if (!refreshToken) return;

    await this.prisma.refreshSession.updateMany({
      data: { revokedAt: new Date() },
      where: { revokedAt: null, tokenHash: this.hashRefreshToken(refreshToken) },
    });
  }

  private async issueTokens(user: TokenUser) {
    const refreshToken = this.newRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + this.refreshTokenTtlMs);
    await this.prisma.refreshSession.create({
      data: { expiresAt: refreshExpiresAt, tokenHash: this.hashRefreshToken(refreshToken), userId: user.id },
    });
    return this.tokensFor(user, refreshToken, refreshExpiresAt);
  }

  private tokensFor(user: TokenUser, refreshToken: string, refreshExpiresAt: Date) {
    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email });
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
    return randomBytes(32).toString("base64url");
  }

  private hashRefreshToken(refreshToken: string) {
    return createHash("sha256").update(refreshToken).digest("hex");
  }

  private refreshTokenTtlMsFrom(value: string) {
    const days = Number(value);
    if (!Number.isSafeInteger(days) || days <= 0 || days > Math.floor(Number.MAX_SAFE_INTEGER / DAY_MS)) {
      throw new Error("REFRESH_TOKEN_TTL_DAYS must be a positive integer.");
    }
    return days * DAY_MS;
  }

  private unauthorized() {
    return new UnauthorizedException({ code: "UNAUTHORIZED", message: "인증이 필요합니다." });
  }
}
