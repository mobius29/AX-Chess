import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { hasSession } from "@/app/_lib/auth/sessionCookies";

const AuthLayout = async ({ children }: { children: ReactNode }) => {
  const cookieStore = await cookies();
  if (hasSession(cookieStore)) redirect("/");

  return <main className="bg-canvas flex flex-1">{children}</main>;
};

export default AuthLayout;
