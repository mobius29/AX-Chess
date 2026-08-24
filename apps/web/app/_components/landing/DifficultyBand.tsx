import clsx from "clsx";

import { Badge } from "@/app/_components/ui/Badge";

const LEVELS = [
  {
    body: "맹기 초심자가 이길 수 있는 수준. 첫 판을 끝까지 두는 게 목표일 때.",
    elo: "Elo 800",
    featured: false,
    name: "Easy",
  },
  {
    body: "맹기로 두면 접전. 머릿속 보드가 한 번씩 흔들리는 구간이 생깁니다.",
    elo: "Elo 1100",
    featured: true,
    name: "Normal",
  },
  {
    body: "이기면 성취감이 있는 수준. 복기가 가장 재미있어지는 구간입니다.",
    elo: "Elo 1400",
    featured: false,
    name: "Hard",
  },
];

const DifficultyBand = () => (
  <section className="mx-auto flex w-full max-w-[1400px] flex-col gap-12 px-5 py-16 md:px-10 md:py-24" id="difficulty">
    <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
      <div className="flex max-w-[560px] flex-col gap-4">
        <p className="text-caption-3 text-muted">난이도</p>
        <h2 className="text-title-2 text-ink font-semibold">맹기 기준으로 맞췄습니다.</h2>
      </div>
      <p className="text-body-3 text-muted max-w-[320px] md:text-right">
        보드 없이 두면 실질 기력은 평소보다 낮아집니다. 일반 체스 앱보다 의도적으로 낮게 잡은 값입니다.
      </p>
    </div>

    <div className="grid w-full gap-6 md:grid-cols-3">
      {LEVELS.map(({ body, elo, featured, name }) => (
        <div
          className={clsx(
            "bg-canvas flex flex-col gap-4 rounded-lg border p-8",
            featured ? "border-primary" : "border-hairline",
          )}
          key={name}
        >
          <div className="flex items-center justify-between">
            <p className="text-title-3 text-ink font-semibold">{name}</p>
            <div className="flex items-center gap-2">
              {featured && <Badge variant="coral">추천</Badge>}
              <Badge>{elo}</Badge>
            </div>
          </div>
          <p className="text-body-3 text-body">{body}</p>
        </div>
      ))}
    </div>
  </section>
);

export default DifficultyBand;
