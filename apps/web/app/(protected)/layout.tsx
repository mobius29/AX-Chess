import type { ReactNode } from "react";

import { ProtectedShell } from "@/app/_components/layout/ProtectedShell";

const ProtectedLayout = ({ children }: { children: ReactNode }) => <ProtectedShell>{children}</ProtectedShell>;

export default ProtectedLayout;
