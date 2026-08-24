import NextLink from "next/link";

import { BrandLink, Link } from "@/app/_components/ui/Link";

const NAV_LINKS = [
  { href: "#identity", label: "맹기 체스란" },
  { href: "#difficulty", label: "난이도" },
  { href: "#review", label: "복기" },
];

const Nav = () => (
  <div className="border-hairline-soft bg-canvas sticky top-0 z-10 border-b">
    <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-5 md:px-10">
      <div className="flex items-center gap-8">
        <BrandLink href="/" />
        <nav aria-label="제품" className="hidden items-center gap-6 sm:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <NextLink
              className="text-body text-body-3 hover:text-primary-active transition-colors"
              href={href}
              key={href}
            >
              {label}
            </NextLink>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <NextLink className="text-body text-body-3 hover:text-primary-active transition-colors" href="/login">
          로그인
        </NextLink>
        <Link href="/sign-up" size="sm" variant="primary">
          시작하기
        </Link>
      </div>
    </div>
  </div>
);

export default Nav;
