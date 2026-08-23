import type { ReactNode } from "react";

import { ProtectedShell } from "./_components/ProtectedShell";

const ProtectedLayout = ({ children }: { children: ReactNode }) => <ProtectedShell>{children}</ProtectedShell>;

export default ProtectedLayout;
