import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:3000";
const AUTH_COOKIE = "accessToken";

type Context = { params: Promise<{ proxy: string[] }> };

const proxyRequest = async (request: Request, { params }: Context) => {
  const { proxy } = await params;
  const path = proxy.map(encodeURIComponent).join("/");

  if (request.method === "POST" && path === "auth/logout") {
    const response = new NextResponse(null, { status: 204 });
    response.cookies.delete(AUTH_COOKIE);
    return response;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  const upstream = await fetch(`${API_URL.replace(/\/$/, "")}/${path}`, {
    body: request.method === "GET" ? undefined : await request.text(),
    cache: "no-store",
    headers: {
      "content-type": request.headers.get("content-type") ?? "application/json",
      ...(token && { authorization: `Bearer ${token}` }),
    },
    method: request.method,
  });

  if (path !== "auth/login" || !upstream.ok) {
    return new NextResponse(upstream.body, {
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
      status: upstream.status,
    });
  }

  const { accessToken, ...body }: { accessToken?: unknown; [key: string]: unknown } = await upstream.json();

  if (typeof accessToken !== "string") {
    return NextResponse.json({ code: "UNAUTHORIZED", message: "로그인 응답이 올바르지 않습니다." }, { status: 502 });
  }

  const response = NextResponse.json(body, { status: upstream.status });
  response.cookies.set(AUTH_COOKIE, accessToken, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax",
    secure: true,
  });
  return response;
};

export const GET = proxyRequest;
export const POST = proxyRequest;
