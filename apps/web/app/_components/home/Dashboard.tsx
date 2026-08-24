"use client";

import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/app/_components/ui/Badge";
import { Button } from "@/app/_components/ui/Button";
import { EmptyState } from "@/app/_components/ui/EmptyState";
import { Link } from "@/app/_components/ui/Link";
import { MoveListPreview } from "@/app/_components/ui/MoveListPreview";
import { activeGameQueryKey, gamesListQueryKey, getActiveGame, getGames } from "@/app/_lib/api/games";
import { formatRelativeDate } from "@/app/_lib/formatRelativeDate";
import { COLOR_LABEL, DIFFICULTY_LABEL, ENDED_REASON_LABEL, RESULT_BADGE_CLASS, RESULT_LABEL } from "@/app/_lib/labels";

const lastMoveLabel = (moves: string[]) => {
  if (moves.length === 0) return null;
  const moveNo = Math.ceil(moves.length / 2);
  const isWhite = moves.length % 2 === 1;
  return `${moveNo}${isWhite ? "." : "..."} ${moves[moves.length - 1]}`;
};

const toMoveRows = (moves: string[]) => {
  const rows: { black?: string; no: number; white: string }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({ black: moves[i + 1], no: i / 2 + 1, white: moves[i] ?? "" });
  }
  return rows;
};

const Dashboard = () => {
  const { data: activeGame, isPending: activeGamePending } = useQuery({
    queryFn: getActiveGame,
    queryKey: activeGameQueryKey,
  });
  const { data: gamesPage, isPending: gamesPending } = useQuery({
    queryFn: () => getGames(),
    queryKey: gamesListQueryKey,
    enabled: !!activeGame,
  });

  if (activeGamePending) {
    return (
      <section className="mx-auto w-full max-w-[1400px] flex-1 px-5 py-14 md:px-10">
        <div className="bg-surface-card h-64 animate-pulse rounded-lg" />
      </section>
    );
  }

  if (!activeGame) {
    return (
      <section className="mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center px-5 py-12 md:px-10">
        <div className="border-hairline bg-surface-card rounded-lg border p-8">
          <p className="text-title-3 text-ink font-semibold">새 대국을 시작하세요</p>
          <p className="text-body-2 text-muted mt-2">색과 난이도를 고르면 바로 시작할 수 있습니다.</p>
          <Link className="mt-6" href="/games/new" variant="primary">
            새 게임 시작
          </Link>
        </div>
      </section>
    );
  }

  const lastMove = lastMoveLabel(activeGame.moves);
  const games = gamesPage?.items.slice(0, 3) ?? [];

  return (
    <section className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-12 px-5 py-14 md:px-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-title-2 text-ink font-semibold">지금 {activeGame.moveCount}수까지 와 있습니다.</h1>
        {lastMove && (
          <p className="text-body-2 text-muted">
            마지막으로 둔 수는 {lastMove}, {activeGame.turn === activeGame.color ? "내 차례" : "AI 차례"}입니다.
          </p>
        )}
      </header>

      <div className="flex w-full flex-col items-start gap-6 lg:flex-row">
        <div className="bg-surface-dark flex w-full flex-1 flex-col gap-8 rounded-lg p-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge dot variant="dark">
                {activeGame.turn === activeGame.color ? "내 차례" : "AI 차례"}
              </Badge>
              <Badge variant="dark">{COLOR_LABEL[activeGame.color]}</Badge>
              <Badge variant="dark">{DIFFICULTY_LABEL[activeGame.difficulty]}</Badge>
            </div>
            <p className="text-title-3 text-on-dark font-semibold">진행 중인 대국</p>
          </div>

          <MoveListPreview highlightLast rows={toMoveRows(activeGame.moves)} />

          <div className="flex items-center justify-between gap-4">
            <p className="text-body-3 text-on-dark-soft">
              총 {activeGame.moveCount}수 · 실착수 {activeGame.illegalCount}
            </p>
            <Link href={`/games/${activeGame.id}`} size="sm" variant="primary">
              이어하기
            </Link>
          </div>
        </div>

        <div className="border-hairline bg-canvas flex w-full flex-1 flex-col gap-6 rounded-lg border p-8">
          <div className="flex flex-col gap-3">
            <p className="text-title-4 text-ink font-semibold">새 대국</p>
            <p className="text-body-3 text-muted">
              진행 중인 대국이 끝나야 새 대국을 시작할 수 있습니다. 동시에 둘 수 있는 판은 하나입니다.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button className="w-full" disabled type="button">
              새 대국 시작
            </Button>
            <p className="text-caption-1 text-muted-soft">
              대국을 끝내려면 이어하기 후 기권해야 합니다. 취소는 제공하지 않습니다.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-title-4 text-ink font-semibold">최근 기록</p>
          <Link href="/records" variant="text">
            전체 보기
          </Link>
        </div>

        {gamesPending ? (
          <div className="bg-surface-card h-32 animate-pulse rounded-lg" />
        ) : games.length === 0 ? (
          <EmptyState
            action={
              <Button disabled type="button">
                새 대국 시작
              </Button>
            }
            body="한 판을 끝내면 여기에 결과와 복기 링크가 쌓입니다."
            title="아직 끝난 대국이 없습니다."
          />
        ) : (
          <div className="border-hairline bg-canvas flex flex-col rounded-lg border">
            {games.map((game) => (
              <div
                className="border-hairline-soft flex items-center gap-4 border-t px-5 py-4 first:border-t-0"
                key={game.id}
              >
                <span
                  className={`w-[72px] shrink-0 rounded-full px-3 py-1.5 text-center text-[13px] font-medium ${RESULT_BADGE_CLASS[game.result]}`}
                >
                  {RESULT_LABEL[game.result]}
                </span>
                <p className="text-title-5 text-ink flex-1">{ENDED_REASON_LABEL[game.endedReason]}</p>
                <p className="text-body-3 text-muted w-[150px]">
                  {DIFFICULTY_LABEL[game.difficulty]} · {COLOR_LABEL[game.color]}
                </p>
                <p className="text-caption-1 text-muted w-[130px]">
                  {game.moveCount}수 · 실착 {game.illegalCount}
                </p>
                <p className="text-caption-1 text-muted-soft w-[92px] text-right">{formatRelativeDate(game.endedAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Dashboard;
