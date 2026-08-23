import { ProtectedShell } from "@/app/_components/layout/ProtectedShell";

const ProfileLayout = ({ children }: LayoutProps<"/profile">) => <ProtectedShell>{children}</ProtectedShell>;

export default ProfileLayout;
