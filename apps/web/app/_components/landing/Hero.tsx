import { Badge } from "@/app/_components/ui/Badge";
import { Link } from "@/app/_components/ui/Link";
import { MoveListPreview } from "@/app/_components/ui/MoveListPreview";

const MOCK_ROWS = [
  { black: "e5", no: 1, white: "e4" },
  { black: "Nc6", no: 2, white: "Nf3" },
];

const Hero = () => (
  <section className="mx-auto flex w-full max-w-[1400px] flex-col items-center gap-12 px-5 py-16 md:flex-row md:px-10 md:py-24">
    <div className="flex flex-1 flex-col items-start gap-6">
      <Badge dot>AI 대전 · 매칭 대기 없음</Badge>

      <h1 className="text-title-1 text-ink w-full font-bold">
        체스판은
        <br />
        머릿속에만 있다.
      </h1>

      <p className="text-body-strong text-[18px] leading-[1.6]">
        AX Chess는 대국 중에 체스판을 그리지 않습니다.
        <br /> 기보를 읽고, 기보로 둡니다. 판은 게임이 끝난 뒤 복기 화면에서만 열립니다.
      </p>

      <div className="flex flex-wrap items-start gap-3">
        <Link href="/sign-up" variant="primary">
          무료로 시작하기
        </Link>
        <Link href="#identity" variant="secondary">
          어떻게 두나요?
        </Link>
      </div>

      <p className="text-body-3 text-muted-soft">이메일 가입 · 상대를 기다릴 필요 없이 AI와 바로 시작</p>
    </div>

    <div className="bg-surface-dark w-full max-w-[440px] shrink-0 rounded-2xl p-6">
      <div className="border-hairline-dark flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <span className="bg-surface-dark-elevated text-on-dark-soft rounded-md px-2.5 py-1.5 text-[11px]">백</span>
          <span className="bg-surface-dark-elevated text-on-dark-soft rounded-md px-2.5 py-1.5 text-[11px]">
            NORMAL
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="bg-primary size-1.5 rounded-full" />
          <span className="text-primary text-[11px]">내 차례</span>
        </div>
      </div>

      <MoveListPreview className="pt-4 pb-2" rows={MOCK_ROWS} />

      <div className="bg-surface-dark-soft border-hairline-dark flex h-11 items-center gap-2.5 rounded-lg border px-3.5">
        <span aria-hidden="true" className="text-primary text-[14px]">
          ▸
        </span>
        <span className="text-on-dark text-[14px]">Bb5</span>
        <span aria-hidden="true" className="bg-primary h-[17px] w-[1.5px]" />
      </div>

      <p className="text-on-dark-soft text-caption-1 pt-3.5">기보법으로 입력합니다 · SAN · UCI · O-O · e8=Q</p>
    </div>
  </section>
);

export default Hero;
