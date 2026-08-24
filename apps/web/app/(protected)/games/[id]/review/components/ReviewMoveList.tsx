import type { ReviewPlyDto } from "@ax-chess/shared";
import clsx from "clsx";
import { useEffect, useRef } from "react";

import { MOVE_CLASSIFICATION_DOT_CLASS } from "@/app/_lib/labels";

type ReviewMoveListProps = {
  currentPly: number;
  onSelect: (ply: number) => void;
  plies: ReviewPlyDto[];
};

const ReviewMoveList = ({ currentPly, onSelect, plies }: ReviewMoveListProps) => {
  const currentRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentPly]);

  const rows: { black?: ReviewPlyDto; no: number; white?: ReviewPlyDto }[] = [];
  for (let i = 0; i < plies.length; i += 2) {
    rows.push({ black: plies[i + 1], no: i / 2 + 1, white: plies[i] });
  }

  const renderCell = (move: ReviewPlyDto | undefined) => {
    if (!move) return <td aria-hidden="true" className="py-2" />;
    const isCurrent = move.ply === currentPly;

    return (
      <td className="py-1">
        <button
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[15px] font-medium transition-colors",
            isCurrent ? "bg-primary/15 text-primary-active" : "text-ink hover:bg-surface-soft",
          )}
          onClick={() => onSelect(move.ply)}
          ref={isCurrent ? currentRef : undefined}
          type="button"
        >
          {move.san}
          <span
            aria-hidden="true"
            className={clsx("size-1.5 rounded-full", MOVE_CLASSIFICATION_DOT_CLASS[move.classification])}
          />
        </button>
      </td>
    );
  };

  return (
    <div className="border-hairline bg-canvas mt-4 max-h-[280px] flex-1 overflow-y-auto rounded-lg border">
      <table className="w-full text-[15px]">
        <tbody>
          {rows.map(({ black, no, white }) => (
            <tr className="border-hairline-soft border-b last:border-0" key={no}>
              <td className="text-muted-soft w-10 py-2 pl-4 text-[13px]">{no}</td>
              {renderCell(white)}
              {renderCell(black)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReviewMoveList;
