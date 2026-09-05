import { generateKeyPairSync } from "node:crypto";

import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import argon2 from "argon2";
import { OAuth2Client } from "google-auth-library";

import { Prisma } from "../../../generated/prisma/client";
import { PrismaService } from "../../prisma.service";
import { AuthService } from "../auth.service";
import { OAuthService } from "./oauth.service";

const conflict = () => new Prisma.PrismaClientKnownRequestError("unique", { code: "P2002", clientVersion: "7.9.1" });

describe("OAuthService", () => {
  const user = { id: "user-1", email: "user@example.com", nickname: "player", passwordHash: null };
  const state = "s".repeat(43);
  const input = { code: "provider-code", state, codeVerifier: "v".repeat(43) };
  const configValues = {
    WEB_URL: "http://localhost:3000",
    OAUTH_BFF_SECRET: "b".repeat(32),
    JWT_SECRET: "access-secret",
    GOOGLE_OAUTH_ENABLED: "true",
    GOOGLE_CLIENT_ID: "google-id",
    GOOGLE_CLIENT_SECRET: "google-secret",
    GOOGLE_REDIRECT_URI: "http://localhost:3000/api/auth/oauth/google/callback",
    KAKAO_OAUTH_ENABLED: "true",
    KAKAO_REST_API_KEY: "kakao-id",
    KAKAO_CLIENT_SECRET: "kakao-secret",
    KAKAO_REDIRECT_URI: "http://localhost:3000/api/auth/oauth/kakao/callback",
  };
  let service: OAuthService;
  let prisma: any;
  let auth: { issueTokens: jest.Mock };
  let fetchMock: jest.SpyInstance;
  const kakao = (account = { email: user.email, is_email_valid: true, is_email_verified: true }) => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ access_token: "provider-token" }))
      .mockResolvedValueOnce(
        Response.json({ id: 123, kakao_account: { ...account, profile: { nickname: "A ! very long nickname 이름" } } }),
      );
  };

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn().mockResolvedValue(user) },
      oAuthAccount: { findUnique: jest.fn(), create: jest.fn() },
      $transaction: jest.fn(async (callback) => callback(prisma)),
    };
    auth = { issueTokens: jest.fn().mockResolvedValue({ accessToken: "app-token" }) };
    service = new OAuthService(
      new ConfigService(configValues),
      prisma as PrismaService,
      auth as unknown as AuthService,
      new JwtService({ secret: "access-secret", signOptions: { expiresIn: "15m" } }),
    );
    fetchMock = jest.spyOn(globalThis, "fetch");
  });
  afterEach(() => jest.restoreAllMocks());

  it("constructs Google PKCE and Kakao comma-separated consent requests", async () => {
    const google = new URL((await service.start("google", state, input.codeVerifier)).authorizationUrl);
    expect(google.searchParams.get("code_challenge_method")).toBe("S256");
    expect(google.searchParams.get("state")).toBe(state);
    const kakaoUrl = new URL((await service.start("kakao", state, input.codeVerifier)).authorizationUrl);
    expect(kakaoUrl.searchParams.get("scope")).toBe("account_email,profile_nickname");
    expect(kakaoUrl.searchParams.has("client_secret")).toBe(false);
  });

  it("fails startup for enabled providers with incomplete configuration", () => {
    expect(
      () =>
        new OAuthService(
          new ConfigService({ ...configValues, KAKAO_CLIENT_SECRET: "" }),
          prisma,
          auth as any,
          new JwtService(),
        ),
    ).toThrow("KAKAO_CLIENT_SECRET");
    expect(
      () =>
        new OAuthService(
          new ConfigService({ ...configValues, GOOGLE_REDIRECT_URI: "https://wrong.example" }),
          prisma,
          auth as any,
          new JwtService(),
        ),
    ).toThrow("GOOGLE_REDIRECT_URI");
  });

  it("creates a user and provider link in one nested write with a valid nickname", async () => {
    kakao();
    await service.complete("kakao", input);
    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data.nickname).toMatch(/^[a-zA-Z0-9가-힣_]{2,16}$/);
    expect(data.oauthAccounts.create).toEqual({ provider: "kakao", providerAccountId: "123" });
    expect(auth.issueTokens).toHaveBeenCalledWith(user, expect.any(Number));
    expect(fetchMock.mock.calls[0][1].body.get("client_secret")).toBe("kakao-secret");
  });

  it("uses the existing provider identity without changing profile or games", async () => {
    kakao({ email: "changed@example.com", is_email_valid: true, is_email_verified: true });
    prisma.oAuthAccount.findUnique.mockResolvedValue({ user });
    await service.complete("kakao", input);
    expect(auth.issueTokens).toHaveBeenCalledWith(user, expect.any(Number));
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("preserves Kakao IDs larger than JavaScript's safe integer limit", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ access_token: "provider-token" }))
      .mockResolvedValueOnce(
        new Response(
          '{"id":9007199254740993,"kakao_account":{"email":"user@example.com","is_email_valid":true,"is_email_verified":true}}',
        ),
      );
    await service.complete("kakao", input);
    expect(prisma.user.create.mock.calls[0][0].data.oauthAccounts.create.providerAccountId).toBe("9007199254740993");
  });

  it.each([
    { email: "", is_email_valid: true, is_email_verified: true },
    { email: user.email, is_email_valid: false, is_email_verified: true },
    { email: user.email, is_email_valid: true, is_email_verified: false },
  ])("rejects missing or unverified Kakao email (%j)", async (account) => {
    kakao(account);
    await expect(service.complete("kakao", input)).rejects.toMatchObject({
      response: { code: "OAUTH_EMAIL_REQUIRED" },
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(auth.issueTokens).not.toHaveBeenCalled();
  });

  it("requires explicit linking for matching email", async () => {
    kakao();
    prisma.user.findUnique.mockResolvedValue(user);
    await expect(service.complete("kakao", input)).rejects.toMatchObject({
      response: { code: "ACCOUNT_LINK_REQUIRED" },
    });
    expect(auth.issueTokens).not.toHaveBeenCalled();
    expect(prisma.oAuthAccount.create).not.toHaveBeenCalled();
  });

  it("recovers concurrent signup by re-reading the unique provider identity", async () => {
    kakao();
    prisma.user.create.mockRejectedValueOnce(conflict());
    prisma.oAuthAccount.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ user });
    await service.complete("kakao", input);
    expect(auth.issueTokens).toHaveBeenCalledTimes(1);
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
  });

  it("retries nickname collisions with a fresh suffix", async () => {
    kakao();
    prisma.user.create.mockRejectedValueOnce(conflict()).mockResolvedValueOnce(user);
    await service.complete("kakao", input);
    expect(prisma.user.create.mock.calls[0][0].data.nickname).not.toBe(
      prisma.user.create.mock.calls[1][0].data.nickname,
    );
  });

  it("requires password re-entry and rejects expired social reauthentication", async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, passwordHash: await argon2.hash("password") });
    await expect(
      service.start("kakao", state, input.codeVerifier, { sub: user.id, email: user.email }, "wrong"),
    ).rejects.toMatchObject({ response: { code: "INVALID_CREDENTIALS" } });
    prisma.user.findUnique.mockResolvedValue(user);
    await expect(
      service.start("kakao", state, input.codeVerifier, { sub: user.id, email: user.email }),
    ).rejects.toMatchObject({ response: { code: "OAUTH_REAUTH_REQUIRED" } });
  });

  it("binds linking to the user, state and provider and keeps tickets separate from access JWTs", async () => {
    const current = { sub: user.id, email: user.email, oauthAuthenticatedAt: Date.now() };
    prisma.user.findUnique.mockResolvedValue(user);
    const { linkTicket } = await service.start("kakao", state, input.codeVerifier, current);
    expect(() => new JwtService({ secret: "access-secret" }).verify(linkTicket!)).toThrow("invalid signature");
    for (const [provider, payload, actor] of [
      ["google", { ...input, linkTicket }, current],
      ["kakao", { ...input, state: "wrong", linkTicket }, current],
      ["kakao", { ...input, linkTicket }, { ...current, sub: "other-user" }],
    ] as const)
      // oxlint-disable-next-line no-await-in-loop -- Check each rejected binding before the successful link uses shared mocks.
      await expect(service.complete(provider, payload, actor)).rejects.toMatchObject({
        response: { code: "OAUTH_FAILED" },
      });
    expect(fetchMock).not.toHaveBeenCalled();
    kakao();
    await expect(service.complete("kakao", { ...input, linkTicket }, current)).resolves.toEqual({ linked: true });
    expect(prisma.oAuthAccount.create).toHaveBeenCalledWith({
      data: { userId: user.id, provider: "kakao", providerAccountId: "123" },
    });
    expect(auth.issueTokens).not.toHaveBeenCalled();
  });

  it("rejects linking an identity already owned by another account", async () => {
    const current = { sub: user.id, email: user.email, oauthAuthenticatedAt: Date.now() };
    prisma.user.findUnique.mockResolvedValue(user);
    const { linkTicket } = await service.start("kakao", state, input.codeVerifier, current);
    kakao();
    prisma.oAuthAccount.create.mockRejectedValue(conflict());
    await expect(service.complete("kakao", { ...input, linkTicket }, current)).rejects.toMatchObject({
      response: { code: "ACCOUNT_LINK_CONFLICT" },
    });
  });

  it("verifies Google signature, issuer, audience, expiry and verified email without network access", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    jest
      .spyOn(OAuth2Client.prototype, "getFederatedSignonCertsAsync")
      .mockResolvedValue({ certs: { test: publicKey } } as never);
    const exchange = jest.spyOn(OAuth2Client.prototype, "getToken");
    const payload = {
      sub: "google-sub",
      email: user.email,
      email_verified: true,
      iss: "https://accounts.google.com",
      aud: "google-id",
      exp: Math.floor(Date.now() / 1000) + 600,
    };
    const signer = new JwtService();
    const sign = (overrides: object) =>
      signer.sign({ ...payload, ...overrides }, { privateKey, algorithm: "RS256", keyid: "test" });
    for (const badToken of [
      "invalid",
      sign({ aud: "another-app" }),
      sign({ iss: "https://attacker.test" }),
      sign({ exp: Math.floor(Date.now() / 1000) - 600 }),
      `${sign({})}tampered`,
      sign({ email_verified: false }),
    ]) {
      exchange.mockResolvedValueOnce({ tokens: { id_token: badToken } } as never);
      // oxlint-disable-next-line no-await-in-loop -- Consume this token's one-shot mock before configuring the next token.
      await expect(service.complete("google", input)).rejects.toBeInstanceOf(Error);
    }
    expect(auth.issueTokens).not.toHaveBeenCalled();
    exchange.mockResolvedValueOnce({ tokens: { id_token: sign({}) } } as never);
    await service.complete("google", input);
    expect(prisma.user.create.mock.calls[0][0].data.oauthAccounts.create.providerAccountId).toBe("google-sub");
    expect(exchange).toHaveBeenLastCalledWith({ code: input.code, codeVerifier: input.codeVerifier });
  });

  it("sanitizes provider failures without issuing sessions", async () => {
    fetchMock.mockRejectedValue(new Error("secret provider token"));
    await expect(service.complete("kakao", input)).rejects.toMatchObject({ response: { code: "OAUTH_FAILED" } });
    expect(auth.issueTokens).not.toHaveBeenCalled();
  });
});
