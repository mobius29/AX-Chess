import { Body, Caption } from "@/app/_components/ui/Typography";

const ReviewAnalyzing = () => (
  <section className="mx-auto w-full max-w-[640px] flex-1 px-5 py-12 md:px-10">
    <div className="bg-surface-card flex h-96 animate-pulse flex-col items-center justify-center gap-2 rounded-lg">
      <Body tone="muted">대국을 분석하고 있습니다...</Body>
      <Caption tone="muted">보통 몇 초, 길면 8초 정도 걸릴 수 있어요.</Caption>
    </div>
  </section>
);

export default ReviewAnalyzing;
