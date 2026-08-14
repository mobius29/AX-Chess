import { BrandLink } from "@/app/_components/ui/Link";

import AuthNav from "./AuthNav";

const Header = () => (
  <header className="mx-auto flex h-20 w-full max-w-[1400px] items-center justify-between px-5 md:px-10">
    <BrandLink href="/" />

    <nav aria-label="계정 메뉴" className="flex items-center gap-2 sm:gap-3">
      <AuthNav />
    </nav>
  </header>
);

export default Header;
