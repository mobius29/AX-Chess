import type { ReviewPlyDto } from "@ax-chess/shared";
import clsx from "clsx";
import { useEffect, useRef } from "react";

import { MOVE_CLASSIFICATION_BADGE_CLASS, MOVE_CLASSIFICATION_LABEL } from "@/app/_lib/labels";

type ReviewMoveListProps = {
  currentPly: number;
  onSelect: (ply: number) => void;
  plies: ReviewPlyDto[];
};

const formatEval = (evalCp: number) => {
  const pawns = (evalCp / 100).toFixed(2);
  return evalCp > 0 ? `+${pawns}` : pawns;
};

const ReviewMoveList = ({ currentPly, onSelect, plies }: ReviewMoveListProps) => {
  const currentRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentPly]);

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-caption-3 text-muted">수순</p>
      <div className="max-h-[380px] w-full overflow-y-auto">
        {plies.map((move) => {
          const isCurrent = move.ply === currentPly;
          const moveNo = Math.ceil(move.ply / 2);
          const notation = move.side === "white" ? `${moveNo}.` : `${moveNo}...`;

          return (
            <button
              className={clsx(
                "flex w-full items-center gap-2.5 rounded-sm px-3 py-2.5 text-left",
                isCurrent && "bg-surface-cream-strong",
              )}
              key={move.ply}
              onClick={() => onSelect(move.ply)}
              ref={isCurrent ? currentRef : undefined}
              type="button"
            >
              <span className="text-muted-soft w-10 shrink-0 text-[12px]">{notation}</span>
              <span className="text-ink min-w-0 flex-1 text-[14px]">{move.san}</span>
              <span className="text-muted text-caption-1 w-[70px] shrink-0 text-right tabular-nums">
                {formatEval(move.evalCp)}
              </span>
              <span
                className={clsx(
                  "shrink-0 rounded-xs px-2 py-1 text-[11px] font-medium",
                  MOVE_CLASSIFICATION_BADGE_CLASS[move.classification],
                )}
              >
                {MOVE_CLASSIFICATION_LABEL[move.classification]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ReviewMoveList;
