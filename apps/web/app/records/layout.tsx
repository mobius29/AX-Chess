import { ProtectedShell } from "@/app/_components/layout/ProtectedShell";

const RecordsLayout = ({ children }: LayoutProps<"/records">) => <ProtectedShell>{children}</ProtectedShell>;

export default RecordsLayout;
