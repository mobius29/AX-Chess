import { createHash } from "crypto";

import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";

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
  let config: { getOrThrow: jest.Mock };
  let jwt: { decode: jest.Mock; sign: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn() },
      game: { groupBy: jest.fn() },
      refreshSession: { create: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) => callback(prisma));

    jwt = { decode: jest.fn(() => ({ exp: 1_700_000_000 })), sign: jest.fn(() => "access-token") };
    config = {
      getOrThrow: jest.fn((key: string) => ({ REFRESH_TOKEN_TTL_DAYS: "7" })[key]),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: config },
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("rotates a refresh token without extending its absolute expiry", async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    prisma.refreshSession.findUnique.mockResolvedValue({
      expiresAt,
      id: "session-1",
      revokedAt: null,
      user: { email: "user@example.com", id: "user-1", nickname: "user" },
      userId: "user-1",
    });
    prisma.refreshSession.updateMany.mockResolvedValue({ count: 1 });

    const tokens = await service.refresh("old-refresh-token");

    expect(tokens.accessToken).toBe("access-token");
    expect(tokens.accessExpiresAt).toEqual(new Date(1_700_000_000_000));
    expect(tokens.refreshToken).not.toBe("old-refresh-token");
    expect(tokens.refreshExpiresAt).toEqual(expiresAt);
    expect(prisma.refreshSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "session-1", revokedAt: null }) }),
    );
    expect(prisma.refreshSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ expiresAt, tokenHash: expect.any(String), userId: "user-1" }),
      }),
    );
    expect(prisma.refreshSession.create.mock.calls[0][0].data.tokenHash).not.toBe(
      createHash("sha256").update("old-refresh-token").digest("hex"),
    );
    expect(jwt.sign).toHaveBeenCalledWith({ email: "user@example.com", sub: "user-1" });
  });

  it("rejects a refresh-token replay when the session was already revoked", async () => {
    prisma.refreshSession.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
      id: "session-1",
      revokedAt: null,
      user: { email: "user@example.com", id: "user-1", nickname: "user" },
      userId: "user-1",
    });
    prisma.refreshSession.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.refresh("old-refresh-token")).rejects.toMatchObject({ status: 401 });
    expect(prisma.refreshSession.create).not.toHaveBeenCalled();
  });

  it("revokes only the matching active session on logout", async () => {
    await service.signOut("refresh-token");

    expect(prisma.refreshSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          revokedAt: null,
          tokenHash: createHash("sha256").update("refresh-token").digest("hex"),
        },
      }),
    );
  });

  it("rejects invalid refresh-token TTL configuration at startup", () => {
    config.getOrThrow.mockImplementation((key: string) => ({ REFRESH_TOKEN_TTL_DAYS: "0" })[key]);

    expect(
      () =>
        new AuthService(
          jwt as unknown as JwtService,
          prisma as unknown as PrismaService,
          config as unknown as ConfigService,
        ),
    ).toThrow("REFRESH_TOKEN_TTL_DAYS must be a positive integer.");
  });
});
