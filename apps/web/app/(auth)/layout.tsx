import type { ReactNode } from "react";

const AuthLayout = ({ children }: { children: ReactNode }) => {
  return <main className="bg-canvas flex flex-1 items-center justify-center px-6 py-12">{children}</main>;
};

export default AuthLayout;
