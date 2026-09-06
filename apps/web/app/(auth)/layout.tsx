import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Link } from "@/app/_components/ui/Link";
import { hasSession } from "@/app/_lib/auth/sessionCookies";

const AuthLayout = async ({ children }: { children: ReactNode }) => {
  const cookieStore = await cookies();
  if (hasSession(cookieStore)) redirect("/");

  return (
    <>
      <main className="bg-canvas flex flex-1">{children}</main>
      <footer className="bg-canvas text-muted flex flex-wrap justify-center gap-5 px-6 py-6 text-sm">
        <Link className="underline underline-offset-4" href="/terms/service">
          서비스 이용약관
        </Link>
        <Link className="underline underline-offset-4" href="/terms/privacy">
          개인정보처리방침
        </Link>
      </footer>
    </>
  );
};

export default AuthLayout;
