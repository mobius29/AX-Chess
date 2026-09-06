import { generateKeyPairSync } from "node:crypto";

import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import argon2 from "argon2";
import { OAuth2Client } from "google-auth-library";

import { Prisma } from "../../../generated/prisma/client";
import { OAuthConfigService } from "../../config/oauth-config.service";
import type { EnvConfigService } from "../../env-config.service";
import { PrismaService } from "../../prisma.service";
import { AuthService } from "../auth.service";
import { OAuthService } from "./oauth.service";

const createService = (config: ConfigService, prisma: PrismaService, auth: AuthService, jwt: JwtService) => {
  const userAuth = new AuthService(jwt, prisma, {} as EnvConfigService);
  userAuth.issueTokens = auth.issueTokens.bind(auth);
  return new OAuthService(new OAuthConfigService(config), config, userAuth, jwt);
};

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
    auth = {
      issueTokens: jest.fn().mockResolvedValue({ accessToken: "app-token" }),
    };
    service = createService(
      new ConfigService(configValues),
      prisma as PrismaService,
      auth as unknown as AuthService,
      new JwtService({ secret: "access-secret", signOptions: { expiresIn: "15m" } }),
    );
    fetchMock = jest.spyOn(globalThis, "fetch");
  });
  afterEach(() => jest.restoreAllMocks());

  it("constructs Google PKCE and requests only the identity scopes needed for signup", async () => {
    const google = new URL((await service.start("google", state, input.codeVerifier)).authorizationUrl);
    expect(google.searchParams.get("code_challenge_method")).toBe("S256");
    expect(google.searchParams.get("state")).toBe(state);
    expect(google.searchParams.get("scope")).toBe("openid email");
    const kakaoUrl = new URL((await service.start("kakao", state, input.codeVerifier)).authorizationUrl);
    expect(kakaoUrl.searchParams.get("scope")).toBe("account_email");
    expect(kakaoUrl.searchParams.has("client_secret")).toBe(false);
  });

  it("validates shared OAuth settings once and reuses them for requests", async () => {
    const config = new ConfigService(configValues);
    const get = jest.spyOn(config, "get");
    service = createService(config, prisma, auth as unknown as AuthService, new JwtService());
    expect(get.mock.calls.filter(([key]) => key === "WEB_URL")).toHaveLength(1);
    get.mockClear();
    prisma.oAuthAccount.findUnique.mockResolvedValue({ user });
    await service.start("google", state, input.codeVerifier);
    await service.start("kakao", state, input.codeVerifier);
    kakao();
    await service.complete("kakao", input);
    expect(service.providers()).toEqual(["google", "kakao"]);
    expect(get).not.toHaveBeenCalled();
  });

  it("does not require OAuth settings when all providers are disabled", () => {
    const config = new OAuthConfigService(
      new ConfigService({
        GOOGLE_OAUTH_ENABLED: "false",
        KAKAO_OAUTH_ENABLED: "false",
      }),
    );
    expect(config.providers()).toEqual([]);
    expect(() => config.settings("google")).toThrow("소셜 로그인을 완료하지 못했습니다.");
  });

  it("fails startup for enabled providers with incomplete configuration", () => {
    expect(() =>
      createService(
        new ConfigService({ ...configValues, KAKAO_CLIENT_SECRET: "" }),
        prisma,
        auth as any,
        new JwtService(),
      ),
    ).toThrow("KAKAO_CLIENT_SECRET");
    expect(() =>
      createService(
        new ConfigService({ ...configValues, GOOGLE_REDIRECT_URI: "https://wrong.example" }),
        prisma,
        auth as any,
        new JwtService(),
      ),
    ).toThrow("GOOGLE_REDIRECT_URI");
  });

  it.each([
    { WEB_URL: "http://localhost:3000/path" },
    { WEB_URL: "http://localhost:3000?query=1" },
    { WEB_URL: "http://localhost:3000#fragment" },
    { WEB_URL: "http://user:password@localhost:3000" },
    { WEB_URL: "ftp://localhost:3000" },
    { NODE_ENV: "production" },
    { OAUTH_BFF_SECRET: "short" },
    { JWT_SECRET: configValues.OAUTH_BFF_SECRET },
  ])("rejects invalid OAuth configuration: %j", (overrides) => {
    expect(() =>
      createService(
        new ConfigService({ ...configValues, ...overrides }),
        prisma,
        auth as unknown as AuthService,
        new JwtService(),
      ),
    ).toThrow(/WEB_URL|OAUTH_BFF_SECRET/);
  });

  it.each([-1, 600_001])("rejects reauthentication outside the window at age %s ms", async (age) => {
    const now = 1_800_000_000_000;
    jest.spyOn(Date, "now").mockReturnValue(now);
    prisma.user.findUnique.mockResolvedValue(user);
    await expect(
      service.start("kakao", state, input.codeVerifier, {
        sub: user.id,
        email: user.email,
        oauthAuthenticatedAt: now - age,
      }),
    ).rejects.toMatchObject({ response: { code: "OAUTH_REAUTH_REQUIRED" }, status: 403 });
  });

  it.each([0, 600_000])("accepts reauthentication at the inclusive boundary of %s ms", async (age) => {
    const now = 1_800_000_000_000;
    jest.spyOn(Date, "now").mockReturnValue(now);
    prisma.user.findUnique.mockResolvedValue(user);
    await expect(
      service.start("kakao", state, input.codeVerifier, {
        sub: user.id,
        email: user.email,
        oauthAuthenticatedAt: now - age,
      }),
    ).resolves.toHaveProperty("linkTicket", expect.any(String));
  });

  it.each([null, [], {}, { access_token: 123 }, { access_token: "" }])(
    "rejects malformed Kakao tokens before fetching a profile: %j",
    async (tokens) => {
      fetchMock.mockResolvedValueOnce(Response.json(tokens));
      await expect(service.complete("kakao", input)).rejects.toMatchObject({ response: { code: "OAUTH_FAILED" } });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(auth.issueTokens).not.toHaveBeenCalled();
    },
  );

  it.each(["github", "kakao"])(
    "rejects unsupported or disabled provider %s before any side effects",
    async (provider) => {
      service = createService(
        new ConfigService({ ...configValues, KAKAO_OAUTH_ENABLED: "false" }),
        prisma,
        auth as unknown as AuthService,
        new JwtService(),
      );
      expect(service.providers()).toEqual(["google"]);
      await expect(service.start(provider, state, input.codeVerifier)).rejects.toMatchObject({
        response: { code: "OAUTH_DISABLED" },
        status: 404,
      });
      await expect(service.complete(provider, input)).rejects.toMatchObject({
        response: { code: "OAUTH_DISABLED" },
        status: 404,
      });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(prisma.oAuthAccount.findUnique).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(auth.issueTokens).not.toHaveBeenCalled();
    },
  );

  const signupTicket = async (provider = "kakao") => {
    const result = await service.complete(provider, input);
    if (!("signupTicket" in result) || !result.signupTicket) throw new Error("Expected pending signup");
    return result.signupTicket;
  };

  it("returns a signup ticket without creating an account or session", async () => {
    kakao();
    const ticket = await signupTicket();
    expect(new JwtService().decode(ticket)).toMatchObject({
      provider: "kakao",
      identity: { id: "123", email: user.email },
      aud: "oauth-signup",
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(auth.issueTokens).not.toHaveBeenCalled();
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
    const ticket = await signupTicket();
    expect(new JwtService().decode(ticket).identity.id).toBe("9007199254740993");
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

  it("creates the account with the chosen nickname and the original authentication time", async () => {
    kakao();
    const ticket = await signupTicket();
    const authenticatedAt = new JwtService().decode(ticket).authenticatedAt;
    prisma.user.findUnique.mockClear();
    prisma.oAuthAccount.findUnique.mockClear();
    await service.completeSignup({ signupTicket: ticket, nickname: "체스_왕" });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: user.email,
        nickname: "체스_왕",
        oauthAccounts: { create: { provider: "kakao", providerAccountId: "123" } },
      },
    });
    expect(auth.issueTokens).toHaveBeenCalledWith(user, authenticatedAt);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.oAuthAccount.findUnique).not.toHaveBeenCalled();
  });

  it("allows a different nickname after a duplicate without repeating OAuth", async () => {
    kakao();
    const ticket = await signupTicket();
    prisma.user.create.mockRejectedValueOnce(conflict());
    prisma.user.findUnique.mockImplementation(async ({ where }: any) => (where.nickname === "taken" ? user : null));
    await expect(service.completeSignup({ signupTicket: ticket, nickname: "taken" })).rejects.toMatchObject({
      response: { code: "NICKNAME_TAKEN" },
      status: 409,
    });
    expect(auth.issueTokens).not.toHaveBeenCalled();
    await service.completeSignup({ signupTicket: ticket, nickname: "available" });
    expect(prisma.user.create).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports a nickname claimed after the availability check without retrying creation", async () => {
    kakao();
    const ticket = await signupTicket();
    prisma.user.create.mockRejectedValueOnce(conflict());
    prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(user);
    await expect(service.completeSignup({ signupTicket: ticket, nickname: "taken" })).rejects.toMatchObject({
      response: { code: "NICKNAME_TAKEN" },
    });
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(auth.issueTokens).not.toHaveBeenCalled();
  });

  it("rejects replay after signup and never issues a second session", async () => {
    kakao();
    const ticket = await signupTicket();
    await service.completeSignup({ signupTicket: ticket, nickname: "player" });
    prisma.oAuthAccount.findUnique.mockResolvedValue({ user });
    prisma.user.create.mockRejectedValueOnce(conflict());
    await expect(service.completeSignup({ signupTicket: ticket, nickname: "other" })).rejects.toMatchObject({
      response: { code: "OAUTH_SIGNUP_EXPIRED" },
      status: 401,
    });
    expect(auth.issueTokens).toHaveBeenCalledTimes(1);
  });

  it("rejects a concurrent signup instead of creating or logging into another account", async () => {
    kakao();
    const ticket = await signupTicket();
    prisma.user.create.mockRejectedValueOnce(conflict());
    prisma.oAuthAccount.findUnique.mockResolvedValue({ user });
    await expect(service.completeSignup({ signupTicket: ticket, nickname: "player" })).rejects.toMatchObject({
      response: { code: "OAUTH_SIGNUP_EXPIRED" },
    });
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(auth.issueTokens).not.toHaveBeenCalled();
  });

  it("rejects expired signup tickets before any database writes", async () => {
    kakao();
    const ticket = await signupTicket();
    jest.spyOn(Date, "now").mockReturnValue(Date.now() + 600_001);
    await expect(service.completeSignup({ signupTicket: ticket, nickname: "player" })).rejects.toMatchObject({
      response: { code: "OAUTH_SIGNUP_EXPIRED" },
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(auth.issueTokens).not.toHaveBeenCalled();
  });

  it("rejects tampered and application JWTs as signup tickets", async () => {
    kakao();
    const ticket = await signupTicket();
    await expect(service.completeSignup({ signupTicket: `${ticket}x`, nickname: "player" })).rejects.toMatchObject({
      response: { code: "OAUTH_SIGNUP_EXPIRED" },
    });
    const access = new JwtService({ secret: "access-secret" }).sign({ sub: user.id });
    await expect(service.completeSignup({ signupTicket: access, nickname: "player" })).rejects.toMatchObject({
      response: { code: "OAUTH_SIGNUP_EXPIRED" },
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("keeps signup and linking tickets separate", async () => {
    kakao();
    const pendingSignup = await signupTicket();
    const current = { sub: user.id, email: user.email, oauthAuthenticatedAt: Date.now() };
    prisma.user.findUnique.mockResolvedValue(user);
    const { linkTicket } = await service.start("kakao", state, input.codeVerifier, current);
    await expect(service.completeSignup({ signupTicket: linkTicket!, nickname: "player" })).rejects.toMatchObject({
      response: { code: "OAUTH_SIGNUP_EXPIRED" },
    });
    fetchMock.mockClear();
    await expect(service.complete("kakao", { ...input, linkTicket: pendingSignup }, current)).rejects.toMatchObject({
      response: { code: "OAUTH_FAILED" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(auth.issueTokens).not.toHaveBeenCalled();
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

  it.each([
    ["google", state, user.id],
    ["kakao", "wrong", user.id],
    ["kakao", state, "other-user"],
  ])("rejects a link ticket for provider=%s state=%s user=%s", async (provider, callbackState, userId) => {
    const current = { sub: user.id, email: user.email, oauthAuthenticatedAt: Date.now() };
    prisma.user.findUnique.mockResolvedValue(user);
    const { linkTicket } = await service.start("kakao", state, input.codeVerifier, current);
    await expect(
      service.complete(
        provider,
        { ...input, state: callbackState, linkTicket },
        {
          ...current,
          sub: userId,
        },
      ),
    ).rejects.toMatchObject({ response: { code: "OAUTH_FAILED" } });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(auth.issueTokens).not.toHaveBeenCalled();
  });

  it("links the account with a valid ticket that is separate from access JWTs", async () => {
    const current = { sub: user.id, email: user.email, oauthAuthenticatedAt: Date.now() };
    prisma.user.findUnique.mockResolvedValue(user);
    const { linkTicket } = await service.start("kakao", state, input.codeVerifier, current);
    expect(() => new JwtService({ secret: "access-secret" }).verify(linkTicket!)).toThrow("invalid signature");
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

  describe("Google ID token verification", () => {
    let sign: (overrides: object) => string;
    let exchange: jest.SpyInstance;

    beforeEach(() => {
      const { privateKey, publicKey } = generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      });
      jest
        .spyOn(OAuth2Client.prototype, "getFederatedSignonCertsAsync")
        .mockResolvedValue({ certs: { test: publicKey } } as never);
      exchange = jest.spyOn(OAuth2Client.prototype, "getToken");
      const payload = {
        sub: "google-sub",
        email: user.email,
        email_verified: true,
        iss: "https://accounts.google.com",
        aud: "google-id",
        exp: Math.floor(Date.now() / 1000) + 600,
      };
      const signer = new JwtService();
      sign = (overrides) =>
        signer.sign(
          { ...payload, ...overrides },
          {
            privateKey,
            algorithm: "RS256",
            keyid: "test",
          },
        );
    });

    it.each([
      ["malformed", () => "invalid"],
      ["wrong audience", () => sign({ aud: "another-app" })],
      ["wrong issuer", () => sign({ iss: "https://attacker.test" })],
      ["expired", () => sign({ exp: Math.floor(Date.now() / 1000) - 600 })],
      ["tampered", () => `${sign({})}tampered`],
      ["unverified email", () => sign({ email_verified: false })],
    ] as const)("rejects a %s token", async (_name, token) => {
      exchange.mockResolvedValueOnce({ tokens: { id_token: token() } });
      await expect(service.complete("google", input)).rejects.toBeInstanceOf(Error);
      expect(auth.issueTokens).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("requires a chosen nickname before creating a Google account, then logs returning users in directly", async () => {
      exchange.mockResolvedValueOnce({ tokens: { id_token: sign({}) } });
      const ticket = await signupTicket("google");
      expect(new JwtService().decode(ticket).identity.id).toBe("google-sub");
      expect(exchange).toHaveBeenLastCalledWith({ code: input.code, codeVerifier: input.codeVerifier });
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(auth.issueTokens).not.toHaveBeenCalled();

      const registeredUser = { ...user, nickname: "체스_왕" };
      prisma.user.create.mockResolvedValueOnce(registeredUser);
      await service.completeSignup({ signupTicket: ticket, nickname: registeredUser.nickname });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: user.email,
          nickname: registeredUser.nickname,
          oauthAccounts: { create: { provider: "google", providerAccountId: "google-sub" } },
        },
      });
      expect(auth.issueTokens).toHaveBeenCalledWith(registeredUser, expect.any(Number));

      prisma.oAuthAccount.findUnique.mockResolvedValueOnce({ user: registeredUser });
      exchange.mockResolvedValueOnce({ tokens: { id_token: sign({}) } });
      const returning = await service.complete("google", input);
      expect(returning).toMatchObject({ accessToken: "app-token", user: { nickname: registeredUser.nickname } });
      expect(returning).not.toHaveProperty("signupTicket");
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(auth.issueTokens).toHaveBeenCalledTimes(2);
    });
  });

  it("sanitizes provider failures without issuing sessions", async () => {
    fetchMock.mockRejectedValue(new Error("secret provider token"));
    await expect(service.complete("kakao", input)).rejects.toMatchObject({ response: { code: "OAUTH_FAILED" } });
    expect(auth.issueTokens).not.toHaveBeenCalled();
  });
});
