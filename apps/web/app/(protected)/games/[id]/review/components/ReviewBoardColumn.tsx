import type { Color, ReviewPlyDto } from "@ax-chess/shared";

import ReviewBoard from "./ReviewBoard";
import ReviewControls from "./ReviewControls";

const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

type ReviewBoardColumnProps = {
  currentMove: ReviewPlyDto | null;
  currentPly: number;
  fen: string;
  onChange: (ply: number) => void;
  orientation: Color;
  totalPlies: number;
};

const ReviewBoardColumn = ({
  currentMove,
  currentPly,
  fen,
  onChange,
  orientation,
  totalPlies,
}: ReviewBoardColumnProps) => {
  const ranks = orientation === "white" ? RANKS : RANKS.toReversed();
  const files = orientation === "white" ? FILES : FILES.toReversed();

  return (
    <div className="flex w-full max-w-[480px] shrink-0 flex-col gap-4">
      <div className="flex gap-2">
        <div className="text-muted-soft flex flex-col items-center justify-between py-1 text-[11px]">
          {ranks.map((rank) => (
            <span key={rank}>{rank}</span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <ReviewBoard fen={fen} orientation={orientation} />
          <div className="text-muted-soft flex justify-between px-1 text-[11px]">
            {files.map((file) => (
              <span key={file}>{file}</span>
            ))}
          </div>
        </div>
      </div>
      <ReviewControls currentMove={currentMove} currentPly={currentPly} onChange={onChange} totalPlies={totalPlies} />
    </div>
  );
};

export default ReviewBoardColumn;
