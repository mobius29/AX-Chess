import ReviewBoard from "@/app/(protected)/games/[id]/review/components/ReviewBoard";
import { MOVE_CLASSIFICATION_BADGE_CLASS, MOVE_CLASSIFICATION_LABEL } from "@/app/_lib/labels";

const MOCK_FEN = "r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 7";

const EVAL_ROWS = [
  { classification: "good" as const, evalCp: 34, no: "5.", san: "O-O" },
  { classification: "good" as const, evalCp: 41, no: "5...", san: "Be7" },
  { classification: "good" as const, evalCp: 28, no: "6.", san: "Re1" },
  { classification: "inaccuracy" as const, evalCp: -87, no: "6...", san: "b5" },
  { classification: "blunder" as const, evalCp: -310, no: "7.", san: "Bxb5" },
];

const formatEval = (evalCp: number) => {
  const pawns = (evalCp / 100).toFixed(2);
  return evalCp > 0 ? `+${pawns}` : pawns;
};

const ReviewBand = () => (
  <section className="bg-surface-soft w-full" id="review">
    <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center gap-12 px-5 py-16 md:flex-row md:px-10 md:py-24">
      <div className="flex w-full flex-col gap-4 md:w-[440px] md:shrink-0">
        <ReviewBoard fen={MOCK_FEN} orientation="white" />
        <div className="text-body-3 text-muted flex items-center justify-between">
          <span>7 / 14</span>
          <span>4. Bb5 a6</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-start gap-6">
        <p className="text-caption-3 text-muted">복기</p>
        <h2 className="text-title-2 text-ink font-semibold">
          어느 수에서
          <br />
          틀어졌는지 보입니다.
        </h2>
        <p className="text-body-2 text-body">
          게임이 끝나면 읽기 전용 보드가 열립니다. 한 수씩 재생하며 엔진 평가치와 블런더를 확인합니다.
        </p>

        <div className="flex w-full flex-col">
          {EVAL_ROWS.map(({ classification, evalCp, no, san }) => (
            <div className="border-hairline-soft flex items-center gap-3 border-b py-2.5" key={no}>
              <span className="text-caption-1 text-muted-soft w-[46px]">{no}</span>
              <span className="text-ink w-[74px] text-[14px]">{san}</span>
              <span className="text-caption-1 text-muted flex-1">{formatEval(evalCp)}</span>
              <span
                className={`text-caption-2 rounded-xs px-2 py-1 font-medium tracking-[0.06em] uppercase ${MOVE_CLASSIFICATION_BADGE_CLASS[classification]}`}
              >
                {MOVE_CLASSIFICATION_LABEL[classification]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default ReviewBand;
