import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import argon2 from "argon2";

import { EnvConfigService } from "../env-config.service";
import { PrismaService } from "../prisma.service";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let service: AuthService;
  let prisma: {
    $transaction: jest.Mock;
    game: { groupBy: jest.Mock };
    refreshSession: { create: jest.Mock; findUnique: jest.Mock; updateMany: jest.Mock };
    user: { create: jest.Mock; findUnique: jest.Mock };
  };
  let jwt: { decode: jest.Mock; sign: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn() },
      game: { groupBy: jest.fn() },
      refreshSession: { create: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.refreshSession.create.mockResolvedValue({ id: "session-2" });
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) => callback(prisma));

    jwt = { decode: jest.fn(() => ({ exp: 1_700_000_000 })), sign: jest.fn(() => "access-token") };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: EnvConfigService, useValue: { refreshTokenTtlMs: 7 * 24 * 60 * 60 * 1000 } },
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("rejects password login for an OAuth-only account", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "oauth-user", passwordHash: null });
    await expect(service.signIn("user@example.com", "password")).rejects.toMatchObject({ status: 401 });
    expect(prisma.refreshSession.create).not.toHaveBeenCalled();
  });

  it("returns connected providers without leaking password hashes", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user",
      email: "user@example.com",
      nickname: "player",
      passwordHash: "private-hash",
      oauthAccounts: [{ provider: "google" }],
    });
    prisma.game.groupBy.mockResolvedValue([]);
    const profile = await service.getCurrentUser("user");
    expect(profile).toMatchObject({ hasPassword: true, connectedProviders: ["google"] });
    expect(profile).not.toHaveProperty("passwordHash");
    expect(profile).not.toHaveProperty("oauthAccounts");
  });

  it("rotates a refresh token without extending its absolute expiry", async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    prisma.refreshSession.findUnique.mockResolvedValue({
      expiresAt,
      id: "session-1",
      revokedAt: null,
      user: { email: "user@example.com", id: "user-1", nickname: "user" },
      tokenHash: await argon2.hash("old-refresh-token"),
      userId: "user-1",
    });
    prisma.refreshSession.updateMany.mockResolvedValue({ count: 1 });

    const tokens = await service.refresh("session-1.old-refresh-token");

    expect(tokens.accessToken).toBe("access-token");
    expect(tokens.accessExpiresAt).toEqual(new Date(1_700_000_000_000));
    expect(tokens.refreshToken).toMatch(/^session-2\./);
    expect(tokens.refreshExpiresAt).toEqual(expiresAt);
    expect(prisma.refreshSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "session-1", revokedAt: null }) }),
    );
    expect(prisma.refreshSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ expiresAt, tokenHash: expect.any(String), userId: "user-1" }),
      }),
    );
    expect(
      await argon2.verify(
        prisma.refreshSession.create.mock.calls[0][0].data.tokenHash,
        tokens.refreshToken.split(".")[1]!,
      ),
    ).toBe(true);
    expect(jwt.sign).toHaveBeenCalledWith({ email: "user@example.com", sub: "user-1" });
  });

  it.each([undefined, 5 * 60_000, 11 * 60_000])(
    "preserves the original OAuth authentication time through repeated refreshes (age: %s)",
    async (age) => {
      const oauthAuthenticatedAt = age === undefined ? undefined : Date.now() - age;
      const user = { id: "user-1", email: "user@example.com", nickname: "user" };
      prisma.refreshSession.create.mockImplementation(async ({ data }) => ({ id: "session-2", ...data }));
      prisma.refreshSession.updateMany.mockResolvedValue({ count: 1 });

      let tokens = await service.issueTokens(user, oauthAuthenticatedAt);
      for (let rotation = 0; rotation < 2; rotation++) {
        const stored = prisma.refreshSession.create.mock.calls.at(-1)![0].data;
        expect(stored.oauthAuthenticatedAt).toEqual(
          oauthAuthenticatedAt === undefined ? null : new Date(oauthAuthenticatedAt),
        );
        prisma.refreshSession.findUnique.mockResolvedValue({ ...stored, id: "session-2", revokedAt: null, user });
        // oxlint-disable-next-line no-await-in-loop -- Each rotation consumes the previous refresh token.
        tokens = await service.refresh(tokens.refreshToken);
        expect(jwt.sign).toHaveBeenLastCalledWith({
          sub: user.id,
          email: user.email,
          ...(oauthAuthenticatedAt === undefined ? {} : { oauthAuthenticatedAt }),
        });
      }
      expect(prisma.refreshSession.create.mock.calls.at(-1)![0].data.oauthAuthenticatedAt).toEqual(
        oauthAuthenticatedAt === undefined ? null : new Date(oauthAuthenticatedAt),
      );
    },
  );

  it("rejects a refresh-token replay when the session was already revoked", async () => {
    prisma.refreshSession.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
      id: "session-1",
      revokedAt: null,
      user: { email: "user@example.com", id: "user-1", nickname: "user" },
      tokenHash: await argon2.hash("old-refresh-token"),
      userId: "user-1",
    });
    prisma.refreshSession.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.refresh("session-1.old-refresh-token")).rejects.toMatchObject({ status: 401 });
    expect(prisma.refreshSession.create).not.toHaveBeenCalled();
  });

  it("revokes only the matching active session on logout", async () => {
    prisma.refreshSession.findUnique.mockResolvedValue({ tokenHash: await argon2.hash("refresh-token") });

    await service.signOut("session-1.refresh-token");

    expect(prisma.refreshSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "session-1",
          revokedAt: null,
        },
      }),
    );
  });
});
