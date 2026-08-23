import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Header } from "@/app/_components/layout/Header";

/** 로그인 쿠키 없으면 /login으로 리다이렉트하고, 있으면 Header + main 래퍼로 감싼다. */
const ProtectedShell = async ({ children }: { children: ReactNode }) => {
  if (!(await cookies()).has("accessToken")) redirect("/login");

  return (
    <main className="bg-canvas flex min-h-[100dvh] flex-col">
      <Header />
      {children}
    </main>
  );
};

export default ProtectedShell;
