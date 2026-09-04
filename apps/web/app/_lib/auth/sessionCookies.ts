import { NextResponse } from "next/server";

export const ACCESS_TOKEN_COOKIE = "accessToken";
export const REFRESH_TOKEN_COOKIE = "refreshToken";

interface TokenResponse {
  accessToken: string;
  refreshExpiresAt: string;
  refreshToken: string;
  user?: unknown;
}

interface CookieStore {
  has(name: string): boolean;
}

export const hasSession = (cookieStore: CookieStore) =>
  cookieStore.has(ACCESS_TOKEN_COOKIE) || cookieStore.has(REFRESH_TOKEN_COOKIE);

export const deleteSessionCookies = (response: NextResponse) => {
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
};

export const setSessionCookies = (response: NextResponse, tokens: TokenResponse) => {
  const refreshExpiresAt = new Date(tokens.refreshExpiresAt);
  const maxAge = Math.floor((refreshExpiresAt.getTime() - Date.now()) / 1000);
  if (!Number.isFinite(maxAge) || maxAge <= 0) return false;

  const options = {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, options);
  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, options);
  return true;
};

export const isTokenResponse = (value: unknown): value is TokenResponse =>
  typeof value === "object" &&
  value !== null &&
  "accessToken" in value &&
  "refreshToken" in value &&
  "refreshExpiresAt" in value &&
  typeof value.accessToken === "string" &&
  typeof value.refreshToken === "string" &&
  typeof value.refreshExpiresAt === "string";
