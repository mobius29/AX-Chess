import type { ReviewPlyDto } from "@ax-chess/shared";

import { Caption } from "@/app/_components/ui/Typography";

type ReviewControlsProps = {
  currentMove: ReviewPlyDto | null;
  currentPly: number;
  onChange: (ply: number) => void;
  totalPlies: number;
};

const moveLabel = (move: ReviewPlyDto | null) => {
  if (!move) return "시작 위치";
  const moveNo = Math.ceil(move.ply / 2);
  return move.side === "white" ? `${moveNo}. ${move.san}` : `${moveNo}... ${move.san}`;
};

const NavButton = ({
  "aria-label": ariaLabel,
  disabled,
  glyph,
  onClick,
}: {
  "aria-label": string;
  disabled: boolean;
  glyph: string;
  onClick: () => void;
}) => (
  <button
    aria-label={ariaLabel}
    className="border-hairline text-ink bg-canvas flex size-10 items-center justify-center rounded-md border text-[13px] disabled:opacity-40"
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    {glyph}
  </button>
);

const Kbd = ({ label }: { label: string }) => (
  <span className="border-hairline text-ink bg-canvas inline-flex size-7 items-center justify-center rounded-xs border-t border-r border-b-2 border-l text-[13px] font-medium">
    {label}
  </span>
);

const ReviewControls = ({ currentMove, currentPly, onChange, totalPlies }: ReviewControlsProps) => (
  <div className="flex w-full items-center justify-between">
    <div className="flex items-center gap-2">
      <NavButton aria-label="처음으로" disabled={currentPly === 0} glyph="⇤" onClick={() => onChange(0)} />
      <NavButton aria-label="이전 수" disabled={currentPly === 0} glyph="←" onClick={() => onChange(currentPly - 1)} />
      <NavButton
        aria-label="다음 수"
        disabled={currentPly === totalPlies}
        glyph="→"
        onClick={() => onChange(currentPly + 1)}
      />
      <NavButton
        aria-label="마지막으로"
        disabled={currentPly === totalPlies}
        glyph="⇥"
        onClick={() => onChange(totalPlies)}
      />
      <Kbd label="←" />
      <Kbd label="→" />
    </div>
    <div className="flex items-center gap-3">
      <Caption className="tabular-nums" tone="muted">
        {currentPly} / {totalPlies}
      </Caption>
      <p className="text-title-5 text-ink">{moveLabel(currentMove)}</p>
    </div>
  </div>
);

export default ReviewControls;
