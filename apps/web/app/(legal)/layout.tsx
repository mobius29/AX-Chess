import type { Metadata } from "next";
import type { ReactNode } from "react";

import { BrandLink, Link } from "@/app/_components/ui/Link";

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-canvas text-ink min-h-screen">
      <header className="border-hairline border-b">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-6 px-6 py-7">
          <BrandLink href="/" />
          <nav aria-label="정책 문서" className="flex flex-wrap gap-5 text-sm">
            <Link className="underline underline-offset-4" href="/terms" prefetch={false}>
              약관 및 정책 전체 보기
            </Link>
          </nav>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-3xl px-6 py-12 md:py-20">
        <p className="text-muted mb-4 text-sm">정책 문서 · 최종 수정일 2026년 9월 7일</p>
        <article className="space-y-10 text-base leading-8 break-keep [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:pl-1 [&_p+p]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          {children}
        </article>
      </main>
      <footer className="border-hairline mx-auto max-w-3xl border-t px-6 py-8 text-sm">
        <Link href="/" className="underline underline-offset-4">
          AX Chess 홈으로 돌아가기
        </Link>
      </footer>
    </div>
  );
}
