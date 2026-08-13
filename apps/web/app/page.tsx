import { BrandLink, Link } from "@/app/_components/Link";

const Home = () => {
  return (
    <main className="bg-canvas flex min-h-[100dvh] flex-col overflow-hidden">
      <header className="mx-auto flex h-20 w-full max-w-[1400px] items-center justify-between px-5 md:px-10">
        <BrandLink href="/" />

        <nav aria-label="계정 메뉴" className="flex items-center gap-2 sm:gap-3">
          <Link
            className="text-body-strong hover:text-primary-active focus-visible:outline-primary rounded-sm px-3 py-2 text-[14px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            href="/login"
          >
            로그인
          </Link>
          <Link className="h-auto px-4 py-2.5 text-[14px]" href="/sign-up" variant="primary">
            회원가입
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-[1400px] flex-1 items-center gap-14 px-5 py-12 md:px-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20 lg:py-16">
        <div className="max-w-[620px]">
          <p className="text-caption-3 text-primary-active mb-5 uppercase">Blindfold chess</p>
          <h1 className="text-ink text-[clamp(2.75rem,6vw,5.5rem)] leading-[1.02] font-semibold tracking-[-0.07em]">
            보지 않아도,
            <span className="text-primary-active block">수는 선명하게.</span>
          </h1>
          <p className="text-body-1 text-body mt-7 max-w-[480px]">
            머릿속 체스판을 그리며 두세요. AI와 한 수씩 주고받으며 블라인드 체스를 연습할 수 있습니다.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/sign-up" variant="primary">
              무료로 시작하기
            </Link>
            <Link href="/login" variant="secondary">
              로그인
            </Link>
          </div>
        </div>

        <figure className="relative mx-auto w-full max-w-[640px] lg:mr-0">
          <div
            className="bg-surface-card absolute -inset-5 translate-x-6 translate-y-6 rounded-lg"
            aria-hidden="true"
          />
          <div
            aria-label="블라인드 체스 연습을 위한 체스판"
            className="border-hairline relative aspect-square w-full overflow-hidden rounded-lg border shadow-[0_28px_80px_rgb(20_20_19_/_0.16)]"
            role="img"
            style={{
              backgroundColor: "var(--sq-light)",
              backgroundImage:
                "conic-gradient(from 90deg, var(--sq-dark) 25%, var(--sq-light) 0 50%, var(--sq-dark) 0 75%, var(--sq-light) 0)",
              backgroundSize: "25% 25%",
            }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 grid grid-cols-8 grid-rows-8"
              style={{
                fontFamily: '"Apple Symbols", "Segoe UI Symbol", "Noto Sans Symbols 2", sans-serif',
              }}
            >
              <span className="text-surface-dark col-start-1 row-start-1 grid place-items-center text-[clamp(2rem,6vw,4.5rem)] leading-none">
                ♜
              </span>
              <span className="text-surface-dark col-start-3 row-start-2 grid place-items-center text-[clamp(2rem,6vw,4.5rem)] leading-none">
                ♞
              </span>
              <span className="text-surface-dark col-start-5 row-start-4 grid place-items-center text-[clamp(2rem,6vw,4.5rem)] leading-none">
                ♛
              </span>
              <span className="col-start-4 row-start-5 grid place-items-center text-[clamp(2rem,6vw,4.5rem)] leading-none text-[#faf9f5] drop-shadow-[0_1px_1px_rgb(20_20_19_/_0.45)]">
                ♙
              </span>
              <span className="col-start-6 row-start-7 grid place-items-center text-[clamp(2rem,6vw,4.5rem)] leading-none text-[#faf9f5] drop-shadow-[0_1px_1px_rgb(20_20_19_/_0.45)]">
                ♘
              </span>
              <span className="col-start-7 row-start-8 grid place-items-center text-[clamp(2rem,6vw,4.5rem)] leading-none text-[#faf9f5] drop-shadow-[0_1px_1px_rgb(20_20_19_/_0.45)]">
                ♔
              </span>
            </div>
          </div>
          <figcaption className="text-caption-1 text-muted relative mt-5 max-w-[420px] pl-px">
            보드 없이 기보만 따라가며 공간 기억과 수읽기를 함께 훈련합니다.
          </figcaption>
        </figure>
      </section>
    </main>
  );
};

export default Home;
