import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

/**
 * 로그인 쿠키 없으면 /login으로 리다이렉트하고, 있으면 main 래퍼로 감싼다.
 * 네브바는 화면마다 다르므로(App nav vs Game nav) 여기서 그리지 않고 각 페이지가 그린다.
 */
const ProtectedShell = async ({ children }: { children: ReactNode }) => {
  if (!(await cookies()).has("accessToken")) redirect("/login");

  return <main className="bg-canvas flex min-h-[100dvh] flex-col">{children}</main>;
};

export default ProtectedShell;
