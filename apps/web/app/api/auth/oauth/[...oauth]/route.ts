import type { NextRequest } from "next/server";

import { handleOAuth } from "@/app/_lib/auth/oauth";

export const maxDuration = 60;
type Context = { params: Promise<{ oauth: string[] }> };

export const GET = async (request: NextRequest, { params }: Context) => handleOAuth(request, (await params).oauth);
export const POST = GET;
