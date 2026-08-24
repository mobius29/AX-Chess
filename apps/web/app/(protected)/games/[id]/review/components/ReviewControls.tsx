import { Button } from "@/app/_components/ui/Button";
import { Caption } from "@/app/_components/ui/Typography";

type ReviewControlsProps = {
  currentPly: number;
  onChange: (ply: number) => void;
  totalPlies: number;
};

const ReviewControls = ({ currentPly, onChange, totalPlies }: ReviewControlsProps) => (
  <div className="mt-4 flex items-center justify-center gap-2">
    <Button
      aria-label="처음으로"
      disabled={currentPly === 0}
      onClick={() => onChange(0)}
      size="sm"
      type="button"
      variant="text"
    >
      ⏮
    </Button>
    <Button
      aria-label="이전 수"
      disabled={currentPly === 0}
      onClick={() => onChange(currentPly - 1)}
      size="sm"
      type="button"
      variant="text"
    >
      ◀
    </Button>
    <Caption className="text-ink w-16 text-center" level={2}>
      {currentPly} / {totalPlies}
    </Caption>
    <Button
      aria-label="다음 수"
      disabled={currentPly === totalPlies}
      onClick={() => onChange(currentPly + 1)}
      size="sm"
      type="button"
      variant="text"
    >
      ▶
    </Button>
    <Button
      aria-label="마지막으로"
      disabled={currentPly === totalPlies}
      onClick={() => onChange(totalPlies)}
      size="sm"
      type="button"
      variant="text"
    >
      ⏭
    </Button>
  </div>
);

export default ReviewControls;
