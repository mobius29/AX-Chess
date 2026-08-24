import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

const AuthLayout = async ({ children }: { children: ReactNode }) => {
  if ((await cookies()).has("accessToken")) redirect("/");

  return <main className="bg-canvas flex flex-1">{children}</main>;
};

export default AuthLayout;
