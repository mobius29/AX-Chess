import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ACCESS_TOKEN_COOKIE,
  deleteSessionCookies,
  isTokenResponse,
  REFRESH_TOKEN_COOKIE,
  setSessionCookies,
} from "@/app/_lib/auth/sessionCookies";

const API_URL = process.env.API_URL ?? "http://localhost:3000";

export const maxDuration = 30;

type Context = { params: Promise<{ proxy: string[] }> };

const proxyRequest = async (request: Request, { params }: Context) => {
  const { proxy } = await params;
  const path = proxy.map(encodeURIComponent).join("/");

  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  const { search } = new URL(request.url);
  const upstream = await fetch(`${API_URL.replace(/\/$/, "")}/${path}${search}`, {
    body: request.method === "GET" ? undefined : await request.text(),
    cache: "no-store",
    headers: {
      "content-type": request.headers.get("content-type") ?? "application/json",
      ...(token && { authorization: `Bearer ${token}` }),
      ...((path === "auth/refresh" || path === "auth/logout") && refreshToken && { "x-refresh-token": refreshToken }),
    },
    method: request.method,
  });

  if (path === "auth/logout") {
    const response = new NextResponse(upstream.body, { status: upstream.status });
    deleteSessionCookies(response);
    return response;
  }

  if ((path !== "auth/login" && path !== "auth/refresh") || !upstream.ok) {
    const response = new NextResponse(upstream.body, {
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
      status: upstream.status,
    });
    if (path === "auth/refresh") deleteSessionCookies(response);
    return response;
  }

  const tokenResponse: unknown = await upstream.json();

  if (!isTokenResponse(tokenResponse)) {
    const response = NextResponse.json(
      { code: "UNAUTHORIZED", message: "로그인 응답이 올바르지 않습니다." },
      { status: 502 },
    );
    if (path === "auth/refresh") deleteSessionCookies(response);
    return response;
  }

  const {
    accessExpiresAt: _accessExpiresAt,
    accessToken: _accessToken,
    refreshExpiresAt: _refreshExpiresAt,
    refreshToken: _refreshToken,
    ...body
  } = tokenResponse;
  const response = NextResponse.json(body, { status: upstream.status });
  if (!setSessionCookies(response, tokenResponse)) {
    const invalidResponse = NextResponse.json(
      { code: "UNAUTHORIZED", message: "로그인 응답이 올바르지 않습니다." },
      { status: 502 },
    );
    if (path === "auth/refresh") deleteSessionCookies(invalidResponse);
    return invalidResponse;
  }
  return response;
};

export const GET = proxyRequest;
export const POST = proxyRequest;
