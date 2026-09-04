import { NextResponse } from "next/server";

export const ACCESS_TOKEN_COOKIE = "accessToken";
export const REFRESH_TOKEN_COOKIE = "refreshToken";

interface TokenResponse {
  accessExpiresAt: string;
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
  const accessExpiresAt = new Date(tokens.accessExpiresAt);
  const refreshExpiresAt = new Date(tokens.refreshExpiresAt);
  if (Number.isNaN(accessExpiresAt.getTime()) || Number.isNaN(refreshExpiresAt.getTime())) return false;

  const options = {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, { ...options, expires: accessExpiresAt });
  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, { ...options, expires: refreshExpiresAt });
  return true;
};

export const isTokenResponse = (value: unknown): value is TokenResponse =>
  typeof value === "object" &&
  value !== null &&
  "accessExpiresAt" in value &&
  "accessToken" in value &&
  "refreshToken" in value &&
  "refreshExpiresAt" in value &&
  typeof value.accessExpiresAt === "string" &&
  typeof value.accessToken === "string" &&
  typeof value.refreshToken === "string" &&
  typeof value.refreshExpiresAt === "string";
