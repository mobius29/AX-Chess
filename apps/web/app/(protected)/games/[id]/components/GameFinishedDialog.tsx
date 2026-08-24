import type { GameStateDto } from "@ax-chess/shared";

import { Dialog } from "@/app/_components/ui/Dialog";
import { Link } from "@/app/_components/ui/Link";
import { ENDED_REASON_LABEL, RESULT_BADGE_CLASS, RESULT_LABEL } from "@/app/_lib/labels";

const RESULT_TITLE: Record<NonNullable<GameStateDto["result"]>, string> = {
  draw: "무승부.",
  loss: "패배.",
  win: "승리.",
};

const GameFinishedDialog = ({ game }: { game: GameStateDto }) => {
  if (!game.result || !game.endedReason) return null;

  const accuracy = Math.round((game.moveCount / (game.moveCount + game.illegalCount)) * 100);

  return (
    <Dialog open>
      <div className="flex flex-col gap-3">
        <span
          className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium ${RESULT_BADGE_CLASS[game.result]}`}
        >
          {RESULT_LABEL[game.result]}
        </span>
        <p className="text-title-2 text-ink font-semibold">{RESULT_TITLE[game.result]}</p>
        <p className="text-body-3 text-muted">
          {game.moveCount}수째에 대국이 끝났습니다. 어느 수에서 머릿속 보드가 틀어졌는지 복기에서 확인해보세요.
        </p>
      </div>

      <div className="mt-7 flex flex-col">
        {[
          { label: "종료 사유", value: ENDED_REASON_LABEL[game.endedReason] },
          { label: "총 수", value: `${game.moveCount}수` },
          { label: "실착수", value: `${game.illegalCount}회` },
          { label: "정확도", value: `${accuracy}%` },
        ].map(({ label, value }) => (
          <div
            className="border-hairline-soft flex items-center justify-between border-b py-2.5 last:border-0"
            key={label}
          >
            <p className="text-body-3 text-muted">{label}</p>
            <p className="text-body-3 text-ink">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-7 flex flex-col gap-3">
        <Link href={`/games/${game.id}/review`} variant="primary">
          복기하기
        </Link>
        <div className="flex gap-3">
          <Link className="flex-1" href="/games/new" size="sm" variant="secondary">
            새 대국
          </Link>
          <Link className="flex-1" href="/" size="sm" variant="secondary">
            홈으로
          </Link>
        </div>
      </div>
    </Dialog>
  );
};

export default GameFinishedDialog;
