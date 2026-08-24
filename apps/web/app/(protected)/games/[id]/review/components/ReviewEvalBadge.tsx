import type { ReviewPlyDto } from "@ax-chess/shared";
import clsx from "clsx";

import { Caption } from "@/app/_components/ui/Typography";
import { MOVE_CLASSIFICATION_BADGE_CLASS, MOVE_CLASSIFICATION_LABEL } from "@/app/_lib/labels";

const formatEval = (evalCp: number) => {
  const pawns = (evalCp / 100).toFixed(1);
  return evalCp > 0 ? `+${pawns}` : pawns;
};

const ReviewEvalBadge = ({ ply }: { ply: ReviewPlyDto | null }) => (
  <div className="mt-3 flex h-7 items-center justify-center gap-2">
    {ply ? (
      <>
        <span
          className={clsx(
            "rounded-full px-3 py-1 text-[13px] font-semibold",
            MOVE_CLASSIFICATION_BADGE_CLASS[ply.classification],
          )}
        >
          {MOVE_CLASSIFICATION_LABEL[ply.classification]}
        </span>
        <Caption tone="muted">{formatEval(ply.evalCp)}</Caption>
      </>
    ) : (
      <Caption tone="muted">시작 위치</Caption>
    )}
  </div>
);

export default ReviewEvalBadge;
