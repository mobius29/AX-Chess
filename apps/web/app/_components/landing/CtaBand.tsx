import { Link } from "@/app/_components/ui/Link";

const CtaBand = () => (
  <section className="mx-auto w-full max-w-[1400px] px-5 py-12 md:px-10 md:py-16">
    <div className="bg-primary flex flex-col items-start justify-between gap-6 rounded-lg p-8 md:flex-row md:items-center md:p-12">
      <div className="text-on-primary flex flex-col gap-3">
        <p className="text-title-3 font-semibold">한 판이면 충분합니다.</p>
        <p className="text-body-2">보드 없이 첫 대국을 끝내고, 복기에서 답을 맞춰보세요.</p>
      </div>
      <Link
        className="bg-canvas text-ink focus-visible:outline-primary inline-flex h-12 shrink-0 items-center justify-center rounded-sm px-[26px] text-[15px] font-semibold transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
        href="/sign-up"
      >
        무료로 시작하기
      </Link>
    </div>
  </section>
);

export default CtaBand;
