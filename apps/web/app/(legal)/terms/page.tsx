import type { Metadata } from "next";

import { Link } from "@/app/_components/ui/Link";

export const metadata: Metadata = {
  title: "약관 및 정책 | AX Chess",
  description: "AX Chess의 서비스 이용약관과 개인정보처리방침을 확인하세요.",
};

const documents = [
  {
    href: "/terms/service",
    title: "서비스 이용약관",
    description: "서비스 이용 조건과 회원의 권리·의무를 안내합니다.",
  },
  {
    href: "/terms/privacy",
    title: "개인정보처리방침",
    description: "개인정보의 처리 목적, 보관 및 이용자의 권리를 안내합니다.",
  },
];

export default function TermsPage() {
  return (
    <>
      <h1>약관 및 정책</h1>
      <p>AX Chess를 이용하기 전에 필요한 약관과 개인정보 보호 정책을 확인하세요.</p>
      <nav aria-label="약관 목록" className="border-hairline divide-hairline divide-y border-y">
        {documents.map(({ href, title, description }) => (
          <Link key={href} href={href} prefetch={false} className="hover:bg-surface-soft block py-6">
            <span className="flex items-center justify-between gap-4 text-lg font-semibold">
              {title}
              <span aria-hidden="true">→</span>
            </span>
            <span className="text-muted mt-2 block text-sm">{description}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
