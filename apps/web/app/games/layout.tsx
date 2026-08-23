import { ProtectedShell } from "@/app/_components/layout/ProtectedShell";

const GamesLayout = ({ children }: LayoutProps<"/games">) => <ProtectedShell>{children}</ProtectedShell>;

export default GamesLayout;
