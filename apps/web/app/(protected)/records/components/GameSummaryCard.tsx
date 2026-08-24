import type { GameSummaryDto } from "@ax-chess/shared";

import { Link } from "@/app/_components/ui/Link";
import { formatGameEndedAt } from "@/app/_lib/formatRelativeDate";
import { COLOR_LABEL, DIFFICULTY_LABEL, ENDED_REASON_LABEL, RESULT_BADGE_CLASS, RESULT_LABEL } from "@/app/_lib/labels";

const GameSummaryCard = ({ game }: { game: GameSummaryDto }) => (
  <Link
    className="border-hairline-soft hover:bg-surface-soft flex w-full items-center gap-4 border-t px-5 py-4 transition-colors first:border-t-0"
    href={`/games/${game.id}/review`}
  >
    <span
      className={`w-[64px] shrink-0 rounded-full px-3 py-1.5 text-center text-[13px] font-medium ${RESULT_BADGE_CLASS[game.result]}`}
    >
      {RESULT_LABEL[game.result]}
    </span>
    <p className="text-title-5 text-ink min-w-0 flex-1 truncate">{ENDED_REASON_LABEL[game.endedReason]}</p>
    <p className="text-body-3 text-muted w-[90px] shrink-0">{DIFFICULTY_LABEL[game.difficulty]}</p>
    <p className="text-body-3 text-muted w-[60px] shrink-0">{COLOR_LABEL[game.color]}</p>
    <p className="text-caption-1 text-muted w-[130px] shrink-0 tabular-nums">
      {game.moveCount}수 · 실착 {game.illegalCount}
    </p>
    <p className="text-caption-1 text-muted-soft w-[110px] shrink-0 tabular-nums">{formatGameEndedAt(game.endedAt)}</p>
    <span className="text-primary text-body-3 w-[48px] shrink-0 text-right">복기</span>
  </Link>
);

export default GameSummaryCard;
