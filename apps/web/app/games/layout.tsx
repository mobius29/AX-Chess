import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Header } from "@/app/_components/layout/Header";

const GamesLayout = async ({ children }: LayoutProps<"/games">) => {
  if (!(await cookies()).has("accessToken")) redirect("/login");

  return (
    <main className="bg-canvas flex min-h-[100dvh] flex-col">
      <Header />
      {children}
    </main>
  );
};

export default GamesLayout;
