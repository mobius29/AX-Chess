import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import argon2 from "argon2";

import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../prisma.service";
import { EmailTakenException } from "./exceptions/email-taken.exception";
import { InvalidCredentialException } from "./exceptions/invalid-credential.exception";
import { NicknameTakenException } from "./exceptions/nickname-taken.exception";

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

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

    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
      user: { id: user.id, nickname: user.nickname },
    };
  }
}
