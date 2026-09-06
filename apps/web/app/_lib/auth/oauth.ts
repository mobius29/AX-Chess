import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import type { OAuthProvider } from "@ax-chess/shared";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  hasSession,
  isTokenResponse,
  oauthSignupCookie,
  setSessionCookies,
} from "./sessionCookies";

const MAX_AGE = 600;
const errors = new Set([
  "OAUTH_FAILED",
  "OAUTH_SIGNUP_EXPIRED",
  "OAUTH_DISABLED",
  "OAUTH_EMAIL_REQUIRED",
  "ACCOUNT_LINK_REQUIRED",
  "ACCOUNT_LINK_CONFLICT",
  "OAUTH_REAUTH_REQUIRED",
  "INVALID_CREDENTIALS",
  "UNAUTHORIZED",
]);

interface OAuthState {
  state: string;
  codeVerifier: string;
  provider: OAuthProvider;
  expiresAt: number;
  linkTicket?: string;
}

export const isOAuthProxyPath = (segments: string[]) => /^auth\/oauth(?:\/|$)/i.test(segments.join("/"));

const cookieName = (provider: string) => `${process.env.NODE_ENV === "production" ? "__Host-" : ""}oauth_${provider}`;
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
});
const secret = () => {
  const value = process.env.OAUTH_BFF_SECRET;
  if (!value || value.length < 32) throw new Error("OAuth is not configured");
  return value;
};
const sign = (value: string) => createHmac("sha256", secret()).update(`oauth-state:${value}`).digest("base64url");

export const encodeOAuthState = (state: OAuthState) => {
  const value = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${value}.${sign(value)}`;
};

export const readOAuthState = (cookie: string | undefined, provider: string, state: string | null): OAuthState => {
  const [value, signature, extra] = (cookie ?? "").split(".");
  if (!value || !signature || extra || !state) throw new Error("Invalid OAuth state");
  const expected = sign(value);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
    throw new Error("Invalid OAuth state");
  const data = JSON.parse(Buffer.from(value, "base64url").toString()) as OAuthState;
  if (
    data.provider !== provider ||
    data.state !== state ||
    !Number.isFinite(data.expiresAt) ||
    data.expiresAt <= Date.now() ||
    typeof data.codeVerifier !== "string" ||
    !/^[a-zA-Z0-9_-]{43,128}$/.test(data.codeVerifier) ||
    (data.linkTicket !== undefined && typeof data.linkTicket !== "string")
  )
    throw new Error("Invalid OAuth state");
  return data;
};

const api = (path: string, body?: unknown, accessToken?: string) =>
  fetch(`${(process.env.API_URL ?? "http://localhost:3000").replace(/\/$/, "")}/auth/oauth/${path}`, {
    method: body === undefined ? "GET" : "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
    headers: {
      "content-type": "application/json",
      "x-oauth-bff-secret": secret(),
      ...(accessToken && { authorization: `Bearer ${accessToken}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const destination = (request: NextRequest, path: string) => {
  try {
    return new URL(path, process.env.WEB_URL || request.url);
  } catch {
    return new URL(path, request.url);
  }
};
const failure = (request: NextRequest, code: string, link = false) =>
  NextResponse.redirect(
    destination(
      request,
      `${link || hasSession(request.cookies) ? "/profile" : "/login"}?error=${errors.has(code) ? code : "OAUTH_FAILED"}`,
    ),
    303,
  );

export async function handleOAuth(request: NextRequest, segments: string[]) {
  const [provider, action] = segments;
  if (provider === "signup") return handleSignup(request, segments);
  if (segments.length === 1 && provider === "providers" && request.method === "GET") {
    try {
      if (!process.env.WEB_URL) throw new Error("WEB_URL is required");
      const response = await api("providers");
      if (!response.ok) throw new Error("Providers unavailable");
      const values: unknown = await response.json();
      if (!Array.isArray(values)) throw new Error("Invalid providers");
      return NextResponse.json(
        values.filter((value) => value === "google" || value === "kakao"),
        { headers: { "cache-control": "no-store" } },
      );
    } catch {
      return NextResponse.json([], { headers: { "cache-control": "no-store" } });
    }
  }
  if ((provider !== "google" && provider !== "kakao") || segments.length > 2)
    return new NextResponse(null, { status: 404 });
  const callback = action === "callback" && request.method === "GET";
  const startLink = action === "link" && request.method === "POST";
  if (!callback && !startLink && !(action === undefined && request.method === "GET"))
    return new NextResponse(null, { status: 405 });

  let link = startLink;
  let validCallback = false;
  let refreshed: ReturnType<typeof tokenResult>;
  const authenticatedApi = async (path: string, body: unknown) => {
    let response = await api(path, body, request.cookies.get(ACCESS_TOKEN_COOKIE)?.value);
    if (response.status === 401) {
      const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
      if (!refreshToken) return response;
      const refresh = await fetch(
        `${(process.env.API_URL ?? "http://localhost:3000").replace(/\/$/, "")}/auth/refresh`,
        {
          method: "POST",
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
          headers: { "x-refresh-token": refreshToken },
        },
      );
      if (!refresh.ok) return response;
      refreshed = tokenResult(await refresh.json());
      if (!refreshed) throw new Error("Invalid session");
      response = await api(path, body, refreshed.accessToken);
    }
    return response;
  };
  const finish = (response: NextResponse) => {
    if (refreshed) setSessionCookies(response, refreshed);
    if (validCallback) response.cookies.set(cookieName(provider), "", { ...cookieOptions(), maxAge: 0 });
    response.headers.set("cache-control", "no-store");
    response.headers.set("referrer-policy", "no-referrer");
    return response;
  };

  try {
    secret();
    if (!process.env.WEB_URL) throw new Error("WEB_URL is required");
    if (callback) {
      const state = readOAuthState(
        request.cookies.get(cookieName(provider))?.value,
        provider,
        request.nextUrl.searchParams.get("state"),
      );
      validCallback = true;
      link = Boolean(state.linkTicket);
      const code = request.nextUrl.searchParams.get("code");
      if (request.nextUrl.searchParams.has("error") || !code || code.length > 4096)
        throw new Error("Provider rejected login");
      const body = { code, state: state.state, codeVerifier: state.codeVerifier, linkTicket: state.linkTicket };
      const upstream = link
        ? await authenticatedApi(`${provider}/link`, body)
        : await api(`${provider}/callback`, body);
      const result = await upstream.json();
      if (!upstream.ok) return finish(failure(request, result?.code, link));
      if (!link && result?.signupRequired === true) {
        if (typeof result.signupTicket !== "string" || !result.signupTicket) throw new Error("Missing signup ticket");
        const response = NextResponse.redirect(destination(request, "/sign-up/nickname"), 303);
        response.cookies.set(oauthSignupCookie(), result.signupTicket, { ...cookieOptions(), maxAge: MAX_AGE });
        return finish(response);
      }
      const response = NextResponse.redirect(destination(request, link ? "/profile?linked=1" : "/"), 303);
      if (link) {
        if (result?.linked !== true) throw new Error("Invalid link response");
      } else if (!isTokenResponse(result) || !setSessionCookies(response, result))
        throw new Error("Invalid token response");
      return finish(response);
    }

    let password: string | undefined;
    if (startLink) {
      if (request.headers.get("origin") !== new URL(process.env.WEB_URL).origin)
        return new NextResponse(null, { status: 403 });
      const form = await request.formData();
      const value = form.get("password");
      if (value !== null && (typeof value !== "string" || value.length > 1024)) throw new Error("Invalid password");
      password = typeof value === "string" ? value : undefined;
    }
    const state: OAuthState = {
      provider,
      state: randomBytes(32).toString("base64url"),
      codeVerifier: randomBytes(32).toString("base64url"),
      expiresAt: Date.now() + MAX_AGE * 1000,
    };
    const body = { state: state.state, codeVerifier: state.codeVerifier, password };
    const upstream = startLink
      ? await authenticatedApi(`${provider}/link/start`, body)
      : await api(`${provider}/start`, body);
    const result = await upstream.json();
    if (!upstream.ok) return finish(failure(request, result?.code, link));
    const url = new URL(result.authorizationUrl);
    const expected =
      provider === "google"
        ? "https://accounts.google.com/o/oauth2/v2/auth"
        : "https://kauth.kakao.com/oauth/authorize";
    if (`${url.origin}${url.pathname}` !== expected || url.searchParams.get("state") !== state.state)
      throw new Error("Invalid authorization URL");
    if (startLink) {
      if (typeof result.linkTicket !== "string" || !result.linkTicket) throw new Error("Missing link ticket");
      state.linkTicket = result.linkTicket;
    }
    const response = NextResponse.redirect(url, 303);
    response.cookies.set(cookieName(provider), encodeOAuthState(state), { ...cookieOptions(), maxAge: MAX_AGE });
    return finish(response);
  } catch {
    return finish(failure(request, "OAUTH_FAILED", link));
  }
}

const tokenResult = (value: unknown) =>
  isTokenResponse(value) &&
  Number.isFinite(Date.parse(value.accessExpiresAt)) &&
  Number.isFinite(Date.parse(value.refreshExpiresAt))
    ? value
    : undefined;

async function handleSignup(request: NextRequest, segments: string[]) {
  if (segments.length !== 1) return new NextResponse(null, { status: 404 });
  if (request.method !== "POST") return new NextResponse(null, { status: 405 });
  const headers = { "cache-control": "no-store" };
  try {
    if (!process.env.WEB_URL || request.headers.get("origin") !== new URL(process.env.WEB_URL).origin)
      return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403, headers });
    const signupTicket = request.cookies.get(oauthSignupCookie())?.value;
    if (!signupTicket)
      return NextResponse.json(
        { code: "OAUTH_SIGNUP_EXPIRED", message: "소셜 인증이 만료되었습니다. 다시 로그인해 주세요." },
        { status: 401, headers },
      );
    const { nickname } = await request.json();
    const upstream = await api("signup", { signupTicket, nickname });
    const result = await upstream.json();
    if (!upstream.ok) {
      const response = NextResponse.json(
        { code: result.code, message: result.message },
        { status: upstream.status, headers },
      );
      if (upstream.status === 401) response.cookies.set(oauthSignupCookie(), "", { ...cookieOptions(), maxAge: 0 });
      return response;
    }
    const response = NextResponse.json({ ok: true }, { headers });
    if (!isTokenResponse(result) || !setSessionCookies(response, result)) throw new Error("Invalid token response");
    response.cookies.set(oauthSignupCookie(), "", { ...cookieOptions(), maxAge: 0 });
    return response;
  } catch {
    return NextResponse.json({ message: "요청을 처리하지 못했습니다. 다시 시도해 주세요." }, { status: 502, headers });
  }
}
