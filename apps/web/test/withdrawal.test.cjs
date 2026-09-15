const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");
const { afterEach, mock, test } = require("node:test");
const ts = require("typescript");

function load(filename) {
  const localRequire = createRequire(filename);
  const module = { exports: {} };
  const source = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const requireSource = (name) => {
    if (name === "next/headers")
      return {
        cookies: async () =>
          new Map([
            ["accessToken", { value: "access" }],
            ["refreshToken", { value: "refresh" }],
          ]),
      };
    if (name === "@/app/_lib/auth/oauth") return { isOAuthProxyPath: () => false };
    if (name.startsWith("@/")) return load(path.resolve(__dirname, "..", name.slice(2) + ".ts"));
    return localRequire(name);
  };
  new Function("require", "module", "exports", source)(requireSource, module, module.exports);
  return module.exports;
}
const { DELETE } = load(path.resolve(__dirname, "../app/api/[...proxy]/route.ts"));
const originalEnv = { ...process.env };
afterEach(() => {
  mock.restoreAll();
  process.env = { ...originalEnv };
});
const send = (origin = "http://web.test") =>
  DELETE(
    new Request("http://web.test/api/auth/me", {
      method: "DELETE",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ password: "secret" }),
    }),
    { params: Promise.resolve({ proxy: ["auth", "me"] }) },
  );

test("withdrawal rejects foreign and missing origins before forwarding", async () => {
  process.env.WEB_URL = "http://web.test";
  const fetch = mock.method(globalThis, "fetch", () => {
    throw new Error("must not forward");
  });
  assert.equal((await send("https://foreign.test")).status, 403);
  assert.equal((await send("")).status, 403);
  assert.equal(fetch.mock.callCount(), 0);
});

test("withdrawal forwards credentials and clears both cookies with an empty 204", async () => {
  process.env.WEB_URL = "http://web.test";
  process.env.NODE_ENV = "test";
  mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(options.method, "DELETE");
    assert.equal(options.headers.authorization, "Bearer access");
    assert.equal(JSON.parse(options.body).password, "secret");
    return new Response(null, { status: 204 });
  });
  const response = await send();
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  assert.equal(response.cookies.get("accessToken").expires.getTime(), 0);
  assert.equal(response.cookies.get("refreshToken").expires.getTime(), 0);
});

for (const status of [400, 401, 403, 500]) {
  test(`failed withdrawal (${status}) preserves cookies`, async () => {
    process.env.WEB_URL = "http://web.test";
    mock.method(globalThis, "fetch", async () => Response.json({ message: "failed" }, { status }));
    const response = await send();
    assert.equal(response.status, status);
    assert.equal(response.headers.has("set-cookie"), false);
  });
}
