import { Badge } from "@/app/_components/ui/Badge";
import { BulletList } from "@/app/_components/ui/BulletList";
import { MoveListPreview } from "@/app/_components/ui/MoveListPreview";

const BULLETS = [
  "불법 수를 두어도 패널티 없음 · 횟수만 기록",
  "실패 이유는 알려주지 않음 · 고정 문구 하나",
  "체크는 SAN의 + 기호 그대로 노출",
];

const MOVE_LIST = [
  { black: "e5", no: 1, white: "e4" },
  { black: "Nc6", no: 2, white: "Nf3" },
  { black: "a6", no: 3, white: "Bb5" },
  { black: "Nf6", no: 4, white: "Ba4" },
  { black: "Be7", no: 5, white: "O-O" },
  { black: "b5", no: 6, white: "Re1" },
  { no: 7, white: "Bb3+" },
];

const CoreExperienceBand = () => (
  <section className="bg-surface-dark w-full">
    <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center gap-12 px-5 py-16 md:flex-row md:px-10 md:py-24">
      <div className="flex flex-1 flex-col items-start gap-6">
        <p className="text-caption-3 text-on-dark-soft">핵심 경험</p>
        <h2 className="text-title-2 text-on-dark font-semibold">
          도전은 하나만.
          <br />
          위치를 끊었는가.
        </h2>
        <p className="text-body-2 text-on-dark-soft">
          수순 암기는 도전 대상이 아닙니다. 그래서 전체 기보는 항상 화면에 남겨둡니다.
          <br />
          사용자가 치러야 할 것은 단 하나, 지금 기물이 어디 있는가입니다.
        </p>
        <div className="bg-hairline-dark h-px w-full" />
        <BulletList items={BULLETS} />
      </div>

      <div className="bg-surface-dark-soft border-hairline-dark w-full flex-1 rounded-lg border p-7">
        <p className="text-caption-3 text-notation-muted">대국 화면에 보이는 전부</p>
        <MoveListPreview className="pt-3.5" highlightLast rows={MOVE_LIST} />
        <div className="flex flex-wrap gap-2 pt-[18px]">
          <Badge dot variant="dark">
            체크
          </Badge>
          <Badge variant="dark">총 14수</Badge>
          <Badge variant="dark">실착수 3</Badge>
        </div>
      </div>
    </div>
  </section>
);

export default CoreExperienceBand;
