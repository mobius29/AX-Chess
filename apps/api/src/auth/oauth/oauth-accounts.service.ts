import { randomBytes } from "node:crypto";

import { Injectable } from "@nestjs/common";

import { Prisma } from "../../../generated/prisma/client";
import { PrismaService } from "../../prisma.service";
import { oauthError } from "./exceptions/oauth.exception";
import type { Identity } from "./oauth.providers";

@Injectable()
export class OAuthAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveUser(provider: string, identity: Identity) {
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

  async link(provider: string, identity: Identity, userId: string) {
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
