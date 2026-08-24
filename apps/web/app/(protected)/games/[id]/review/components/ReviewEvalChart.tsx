import type { ReviewPlyDto } from "@ax-chess/shared";
import clsx from "clsx";

const SCALE_CP = 400;

type ReviewEvalChartProps = {
  currentPly: number;
  onSelect: (ply: number) => void;
  plies: ReviewPlyDto[];
};

const ReviewEvalChart = ({ currentPly, onSelect, plies }: ReviewEvalChartProps) => (
  <div className="flex w-full flex-col gap-3">
    <div className="text-muted flex items-center justify-between">
      <p className="text-caption-3">평가 흐름</p>
      <p className="text-[12px]">centipawn</p>
    </div>
    <div className="border-hairline bg-canvas flex flex-col gap-2.5 rounded-md border px-4 py-3.5">
      <div className="flex h-18 items-center gap-1">
        {plies.map((ply) => {
          const heightPct = Math.min(1, Math.abs(ply.evalCp) / SCALE_CP) * 100;
          const isCurrent = ply.ply === currentPly;

          return (
            <button
              className="flex h-full flex-1 flex-col"
              key={ply.ply}
              onClick={() => onSelect(ply.ply)}
              title={`${ply.san} · ${ply.evalCp > 0 ? "+" : ""}${(ply.evalCp / 100).toFixed(2)}`}
              type="button"
            >
              <div className="border-hairline flex flex-1 flex-col justify-end border-b">
                {ply.evalCp >= 0 && (
                  <div
                    className={clsx("bg-primary w-full rounded-xs", isCurrent && "ring-ink ring-2")}
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                  />
                )}
              </div>
              <div className="flex flex-1 flex-col">
                {ply.evalCp < 0 && (
                  <div
                    className={clsx("bg-muted-soft w-full rounded-xs", isCurrent && "ring-ink ring-2")}
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[12px]">
        <p className="text-primary">↑ 백 우세</p>
        <p className="text-muted">↓ 흑 우세</p>
      </div>
    </div>
  </div>
);

export default ReviewEvalChart;
