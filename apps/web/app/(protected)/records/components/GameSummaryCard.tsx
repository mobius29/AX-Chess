import type { GameSummaryDto } from "@ax-chess/shared";
import clsx from "clsx";

import { Link } from "@/app/_components/ui/Link";
import { Caption } from "@/app/_components/ui/Typography";
import { COLOR_LABEL, DIFFICULTY_LABEL, ENDED_REASON_LABEL, RESULT_BADGE_CLASS, RESULT_LABEL } from "@/app/_lib/labels";

const GameSummaryCard = ({ game }: { game: GameSummaryDto }) => (
  <li>
    <Link
      className="border-hairline bg-surface-card hover:bg-surface-soft flex items-center gap-4 rounded-lg border px-5 py-4 transition-colors"
      href={`/games/${game.id}/review`}
    >
      <span
        className={clsx("shrink-0 rounded-full px-3 py-1 text-[13px] font-semibold", RESULT_BADGE_CLASS[game.result])}
      >
        {RESULT_LABEL[game.result]}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-ink truncate text-[15px] font-medium">
          {COLOR_LABEL[game.color]} · {DIFFICULTY_LABEL[game.difficulty]} · {ENDED_REASON_LABEL[game.endedReason]}
        </p>
        <Caption className="mt-1" tone="muted">
          {game.moveCount}수 · 정확도 {Math.round(game.accuracy * 100)}% · {game.endedAt.slice(0, 10)}
        </Caption>
      </div>
    </Link>
  </li>
);

export default GameSummaryCard;
