const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { afterEach, beforeEach, mock, test } = require("node:test");
const ts = require("typescript");
const { NextRequest } = require("next/server");

// Use the installed compiler to run the route logic without another test dependency.
require.extensions[".ts"] = (module, filename) => {
  // oxlint-disable-next-line no-underscore-dangle -- Node's CommonJS compiler entrypoint.
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText,
    filename,
  );
};
const { encodeOAuthState, handleOAuth, isOAuthProxyPath } = require("../app/_lib/auth/oauth.ts");

const originalEnv = { ...process.env };
let fetchMock;
beforeEach(() => {
  process.env.WEB_URL = "http://localhost:3000";
  process.env.API_URL = "http://api.test";
  process.env.OAUTH_BFF_SECRET = "s".repeat(32);
  process.env.NODE_ENV = "test";
  fetchMock = mock.method(globalThis, "fetch", async () => {
    throw new Error("Unexpected upstream call");
  });
});
afterEach(() => {
  mock.restoreAll();
  process.env = { ...originalEnv };
});

const state = (extra = {}) => ({
  provider: "google",
  state: "s".repeat(43),
  codeVerifier: "v".repeat(43),
  expiresAt: Date.now() + 60_000,
  ...extra,
});
const callback = (data = state(), query = `code=code&state=${data.state}`, extraCookie = "") =>
  new NextRequest(`http://localhost:3000/api/auth/oauth/${data.provider}/callback?${query}`, {
    headers: { cookie: `oauth_${data.provider}=${encodeOAuthState(data)}; ${extraCookie}` },
  });
const tokens = () => ({
  accessToken: "access-secret",
  refreshToken: "refresh-secret",
  accessExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  refreshExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
});

test("blocks every OAuth path through the generic proxy, including case and encoded-slash segments", () => {
  assert.equal(isOAuthProxyPath(["auth", "oauth", "google", "callback"]), true);
  assert.equal(isOAuthProxyPath(["AUTH", "OAuth", "google", "link"]), true);
  assert.equal(isOAuthProxyPath(["auth/oauth/google/callback"]), true);
  assert.equal(isOAuthProxyPath(["auth", "login"]), false);
});

for (const [name, makeRequest] of [
  [
    "missing state",
    () => new NextRequest(`http://localhost:3000/api/auth/oauth/google/callback?code=code&state=${state().state}`),
  ],
  ["expired state", () => callback(state({ expiresAt: Date.now() - 1 }))],
  ["mismatched state", () => callback(state(), "code=code&state=wrong")],
  [
    "tampered state",
    () =>
      new NextRequest(`http://localhost:3000/api/auth/oauth/google/callback?code=code&state=${state().state}`, {
        headers: { cookie: `oauth_google=${encodeOAuthState(state())}x` },
      }),
  ],
  ["wrong provider", () => callback(state({ provider: "kakao" }))],
]) {
  test(`${name} never reaches the API`, async () => {
    const response = await handleOAuth(makeRequest(), ["google", "callback"]);
    assert.match(response.headers.get("location"), /login\?error=OAUTH_FAILED$/);
    assert.equal(response.cookies.has("oauth_google"), false);
    assert.equal(response.cookies.has("accessToken"), false);
    assert.equal(fetchMock.mock.callCount(), 0);
  });
}

test("a stale callback preserves the newer state so the current login can finish", async () => {
  const current = state();
  const stale = await handleOAuth(callback(current, "code=old-code&state=old-state"), ["google", "callback"]);
  assert.equal(stale.cookies.has("oauth_google"), false);
  assert.equal(fetchMock.mock.callCount(), 0);

  fetchMock.mock.mockImplementation(async () => Response.json(tokens()));
  const response = await handleOAuth(callback(current), ["google", "callback"]);
  assert.equal(response.headers.get("location"), "http://localhost:3000/");
  assert.equal(response.cookies.get("oauth_google").maxAge, 0);
  assert.equal(response.cookies.get("accessToken").value, "access-secret");
});

test("consent cancellation clears state and preserves the existing session", async () => {
  const data = state();
  const response = await handleOAuth(
    callback(data, `error=access_denied&state=${data.state}`, "accessToken=existing"),
    ["google", "callback"],
  );
  assert.equal(fetchMock.mock.callCount(), 0);
  assert.equal(response.cookies.has("accessToken"), false);
  assert.equal(response.cookies.get("oauth_google").value, "");
  assert.equal(response.headers.get("location"), "http://localhost:3000/profile?error=OAUTH_FAILED");
});

test("successful callback sets HttpOnly app cookies and never returns token bodies", async () => {
  fetchMock.mock.mockImplementation(async (url, options) => {
    assert.equal(url, "http://api.test/auth/oauth/google/callback");
    assert.equal(options.headers["x-oauth-bff-secret"], "s".repeat(32));
    assert.equal(JSON.parse(options.body).codeVerifier, "v".repeat(43));
    return Response.json(tokens());
  });
  const response = await handleOAuth(callback(), ["google", "callback"]);
  assert.equal(response.headers.get("location"), "http://localhost:3000/");
  assert.equal(response.cookies.get("accessToken").httpOnly, true);
  assert.equal(response.cookies.get("refreshToken").sameSite, "lax");
  assert.equal(response.cookies.get("oauth_google").value, "");
  assert.equal(await response.text(), "");
});

for (const [name, response] of [
  ["email conflict", () => Response.json({ code: "ACCOUNT_LINK_REQUIRED" }, { status: 409 })],
  ["invalid expiry", () => Response.json({ ...tokens(), refreshExpiresAt: "invalid" })],
  ["empty access token", () => Response.json({ ...tokens(), accessToken: "" })],
]) {
  test(`${name} returns a safe error without replacing cookies`, async () => {
    fetchMock.mock.mockImplementation(async () => response());
    const result = await handleOAuth(callback(), ["google", "callback"]);
    assert.match(result.headers.get("location"), /login\?error=(ACCOUNT_LINK_REQUIRED|OAUTH_FAILED)$/);
    assert.equal(result.cookies.has("accessToken"), false);
  });
}

test("link starts reject a foreign origin before sending the password", async () => {
  const request = new NextRequest("http://localhost:3000/api/auth/oauth/google/link", {
    method: "POST",
    headers: { origin: "https://attacker.test" },
    body: new URLSearchParams({ password: "secret" }),
  });
  assert.equal((await handleOAuth(request, ["google", "link"])).status, 403);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("link callbacks refresh expired access, keep the current session, and send the bound ticket", async () => {
  let calls = 0;
  fetchMock.mock.mockImplementation(async (url, options) => {
    calls++;
    if (calls === 1) return Response.json({ code: "UNAUTHORIZED" }, { status: 401 });
    if (calls === 2) {
      assert.equal(url, "http://api.test/auth/refresh");
      assert.equal(options.headers["x-refresh-token"], "old-refresh");
      return Response.json(tokens());
    }
    assert.equal(url, "http://api.test/auth/oauth/google/link");
    assert.equal(options.headers.authorization, "Bearer access-secret");
    assert.equal(JSON.parse(options.body).linkTicket, "signed-link-ticket");
    return Response.json({ linked: true });
  });
  const response = await handleOAuth(
    callback(state({ linkTicket: "signed-link-ticket" }), undefined, "accessToken=expired; refreshToken=old-refresh"),
    ["google", "callback"],
  );
  assert.equal(response.headers.get("location"), "http://localhost:3000/profile?linked=1");
  assert.equal(response.cookies.get("refreshToken").value, "refresh-secret");
  assert.equal(calls, 3);
});

test("start redirects only to the expected provider and stores protected state", async () => {
  fetchMock.mock.mockImplementation(async (_url, options) => {
    const { state: requestState } = JSON.parse(options.body);
    return Response.json({ authorizationUrl: `https://kauth.kakao.com/oauth/authorize?state=${requestState}` });
  });
  const request = new NextRequest("http://localhost:3000/api/auth/oauth/kakao");
  const response = await handleOAuth(request, ["kakao"]);
  assert.match(response.headers.get("location"), /^https:\/\/kauth.kakao.com/);
  assert.equal(response.cookies.get("oauth_kakao").httpOnly, true);
  assert.equal(response.cookies.get("oauth_kakao").maxAge, 600);
  fetchMock.mock.mockImplementation(async () => Response.json({ authorizationUrl: "https://attacker.test" }));
  assert.match((await handleOAuth(request, ["kakao"])).headers.get("location"), /login\?error=OAUTH_FAILED$/);
});

test("missing credentials hide providers and direct POST callbacks are not exposed", async () => {
  delete process.env.OAUTH_BFF_SECRET;
  const providers = await handleOAuth(new NextRequest("http://localhost:3000/api/auth/oauth/providers"), ["providers"]);
  assert.deepEqual(await providers.json(), []);
  const response = await handleOAuth(
    new NextRequest("http://localhost:3000/api/auth/oauth/google/callback", { method: "POST" }),
    ["google", "callback"],
  );
  assert.equal(response.status, 405);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("an unset WEB_URL fails safely even when deployment passes an empty variable", async () => {
  process.env.WEB_URL = "";
  const response = await handleOAuth(new NextRequest("http://localhost:3000/api/auth/oauth/google"), ["google"]);
  assert.equal(response.headers.get("location"), "http://localhost:3000/login?error=OAUTH_FAILED");
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("new OAuth users receive only a signup cookie and go to the nickname page", async () => {
  fetchMock.mock.mockImplementation(async () => Response.json({ signupRequired: true, signupTicket: "signup-secret" }));
  const response = await handleOAuth(callback(), ["google", "callback"]);
  assert.equal(response.headers.get("location"), "http://localhost:3000/sign-up/nickname");
  assert.equal(response.cookies.get("oauth_signup").httpOnly, true);
  assert.equal(response.cookies.get("oauth_signup").value, "signup-secret");
  assert.equal(response.cookies.get("oauth_signup").maxAge, 600);
  assert.equal(response.cookies.get("oauth_google").maxAge, 0);
  assert.equal(response.cookies.has("accessToken"), false);
  assert.equal(await response.text(), "");
});

const signupRequest = (extra = {}) =>
  new NextRequest("http://localhost:3000/api/auth/oauth/signup", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      cookie: "oauth_signup=signed-ticket",
      "content-type": "application/json",
      ...extra,
    },
    body: JSON.stringify({ nickname: "chosen", signupTicket: "attacker-ticket", email: "attacker@example.com" }),
  });

test("signup forwards only nickname and the HttpOnly ticket then installs the session", async () => {
  fetchMock.mock.mockImplementation(async (url, options) => {
    assert.equal(url, "http://api.test/auth/oauth/signup");
    assert.deepEqual(JSON.parse(options.body), { signupTicket: "signed-ticket", nickname: "chosen" });
    return Response.json(tokens());
  });
  const response = await handleOAuth(signupRequest(), ["signup"]);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(response.cookies.get("oauth_signup").maxAge, 0);
  assert.equal(response.cookies.get("accessToken").httpOnly, true);
  assert.equal(response.cookies.get("refreshToken").value, "refresh-secret");
});

test("duplicate nicknames preserve the signup ticket for another attempt", async () => {
  fetchMock.mock.mockImplementation(async () =>
    Response.json({ code: "NICKNAME_TAKEN", message: "이미 사용 중인 닉네임입니다." }, { status: 409 }),
  );
  const response = await handleOAuth(signupRequest(), ["signup"]);
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, "NICKNAME_TAKEN");
  assert.equal(response.cookies.has("oauth_signup"), false);
  assert.equal(response.cookies.has("accessToken"), false);
});

test("signup requires same origin and an existing ticket", async () => {
  const foreign = await handleOAuth(signupRequest({ origin: "https://attacker.test" }), ["signup"]);
  assert.equal(foreign.status, 403);
  const missing = await handleOAuth(signupRequest({ cookie: "" }), ["signup"]);
  assert.equal(missing.status, 401);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("expired signup tickets are cleared without issuing a session", async () => {
  fetchMock.mock.mockImplementation(async () => Response.json({ code: "OAUTH_SIGNUP_EXPIRED" }, { status: 401 }));
  const response = await handleOAuth(signupRequest(), ["signup"]);
  assert.equal(response.status, 401);
  assert.equal(response.cookies.get("oauth_signup").maxAge, 0);
  assert.equal(response.cookies.has("accessToken"), false);
});
