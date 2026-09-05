import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AuthController } from "../auth.controller";
import { AuthService } from "../auth.service";
import { OAuthBffGuard } from "./oauth-bff.guard";
import { OAuthController } from "./oauth.controller";
import { OAuthService } from "./oauth.service";

describe("OAuth HTTP boundary", () => {
  let app: INestApplication;
  const secret = "b".repeat(32);
  const oauth = {
    completeSignup: jest.fn().mockResolvedValue({ accessToken: "app-token" }),
    complete: jest.fn().mockResolvedValue({ linked: true }),
    start: jest.fn().mockResolvedValue({}),
    providers: () => ["google"],
  };
  const auth = { checkNickname: jest.fn().mockResolvedValue({ available: true }) };
  const jwt = new JwtService({ secret: "access-secret" });
  const body = { code: "code", state: "s".repeat(43), codeVerifier: "v".repeat(43) };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [OAuthController, AuthController],
      providers: [
        OAuthBffGuard,
        { provide: AuthService, useValue: auth },
        { provide: ConfigService, useValue: new ConfigService({ OAUTH_BFF_SECRET: secret }) },
        { provide: OAuthService, useValue: oauth },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.listen(0, "127.0.0.1");
  });
  afterAll(async () => {
    await app.close();
  });
  afterEach(() => jest.clearAllMocks());

  it("rejects direct callback requests without the BFF credential", async () => {
    await request(app.getHttpServer()).post("/auth/oauth/google/callback").send(body).expect(403);
    await request(app.getHttpServer())
      .post("/auth/oauth/google/callback")
      .set("x-oauth-bff-secret", "wrong")
      .send(body)
      .expect(403);
    expect(oauth.complete).not.toHaveBeenCalled();
  });

  it.each(["x".repeat(32), "한".repeat(32)])("rejects an incorrect BFF secret: %s", async (value) => {
    await request(app.getHttpServer())
      .post("/auth/oauth/google/callback")
      .set("x-oauth-bff-secret", Buffer.from(value).toString("latin1"))
      .send(body)
      .expect(403);
    expect(oauth.complete).not.toHaveBeenCalled();
  });

  it("exposes nickname checks through auth without OAuth credentials", async () => {
    await request(app.getHttpServer())
      .post("/auth/nickname/check")
      .send({ nickname: "체스_왕" })
      .expect(200, { available: true });
    expect(auth.checkNickname).toHaveBeenCalledWith("체스_왕");
  });

  it("validates nicknames at the shared auth boundary", async () => {
    await request(app.getHttpServer()).post("/auth/nickname/check").send({ nickname: "bad name" }).expect(400);
    expect(auth.checkNickname).not.toHaveBeenCalled();
  });

  it("protects signup with BFF credentials", async () => {
    await request(app.getHttpServer())
      .post("/auth/oauth/signup")
      .send({ signupTicket: "ticket", nickname: "player" })
      .expect(403);
    expect(oauth.completeSignup).not.toHaveBeenCalled();
  });

  it.each(["", "a", "a".repeat(17), "bad name"])("rejects invalid signup nickname %s", async (nickname) => {
    await request(app.getHttpServer())
      .post("/auth/oauth/signup")
      .set("x-oauth-bff-secret", secret)
      .send({ signupTicket: "ticket", nickname })
      .expect(400);
    expect(oauth.completeSignup).not.toHaveBeenCalled();
  });

  it("rejects malformed codes before provider calls", async () => {
    await request(app.getHttpServer())
      .post("/auth/oauth/google/callback")
      .set("x-oauth-bff-secret", secret)
      .send({ ...body, code: "" })
      .expect(400);
    expect(oauth.complete).not.toHaveBeenCalled();
  });

  it("requires an application JWT for both linking endpoints", async () => {
    await request(app.getHttpServer())
      .post("/auth/oauth/google/link/start")
      .set("x-oauth-bff-secret", secret)
      .send(body)
      .expect(401);
    await request(app.getHttpServer())
      .post("/auth/oauth/google/link")
      .set("x-oauth-bff-secret", secret)
      .send(body)
      .expect(401);
    expect(oauth.complete).not.toHaveBeenCalled();
  });

  it("forwards the verified current user instead of a submitted user ID", async () => {
    const token = jwt.sign({ sub: "current-user", email: "user@example.com" }, { expiresIn: "1m" });
    await request(app.getHttpServer())
      .post("/auth/oauth/google/link")
      .set("x-oauth-bff-secret", secret)
      .set("authorization", `Bearer ${token}`)
      .send({ ...body, userId: "attacker" })
      .expect(200);
    expect(oauth.complete).toHaveBeenCalledWith(
      "google",
      expect.any(Object),
      expect.objectContaining({ sub: "current-user" }),
    );
  });
});
