"use client";

import type { CreateGameRequest } from "@ax-chess/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppNav } from "@/app/_components/layout/AppNav";
import { Button } from "@/app/_components/ui/Button";
import { ChoiceCard } from "@/app/_components/ui/ChoiceCard";
import { EmptyState } from "@/app/_components/ui/EmptyState";
import { Link } from "@/app/_components/ui/Link";
import { Segmented } from "@/app/_components/ui/Segmented";
import { Stat } from "@/app/_components/ui/Stat";
import { Caption } from "@/app/_components/ui/Typography";
import { currentUserQueryKey, getCurrentUser } from "@/app/_lib/api/auth";
import { activeGameQueryKey, createGame, gamesListQueryKey, getActiveGame, getGames } from "@/app/_lib/api/games";
import { COLOR_LABEL, DIFFICULTY_LABEL, ENDED_REASON_LABEL, RESULT_BADGE_CLASS, RESULT_LABEL } from "@/app/_lib/labels";

import { COLOR_CHOICES, DIFFICULTY_CHOICES } from "./constants";

const NewGamePage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState<CreateGameRequest>({ color: "random", difficulty: "normal" });

  const activeGameQuery = useQuery({ queryFn: getActiveGame, queryKey: activeGameQueryKey });
  const userQuery = useQuery({ queryFn: getCurrentUser, queryKey: currentUserQueryKey, retry: false });
  const gamesQuery = useQuery({ queryFn: () => getGames(), queryKey: gamesListQueryKey });

  const createGameMutation = useMutation({
    mutationFn: () => createGame(settings),
    onSuccess: (game) => {
      queryClient.setQueryData(activeGameQueryKey, game);
      router.push(`/games/${game.id}`);
    },
  });

  useEffect(() => {
    if (activeGameQuery.data) router.replace(`/games/${activeGameQuery.data.id}`);
  }, [activeGameQuery.data, router]);

  if (activeGameQuery.isPending || activeGameQuery.data) return <AppNav />;

  const games = gamesQuery.data?.items.slice(0, 3) ?? [];

  return (
    <>
      <AppNav />
      <section className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-12 px-5 py-14 md:flex-row md:px-10">
        <div className="flex w-full flex-1 flex-col gap-8">
          <header className="flex flex-col gap-2">
            <h1 className="text-title-2 text-ink font-semibold">바로 한 판.</h1>
            <p className="text-body-2 text-muted">색과 난이도만 고르면 됩니다. 기다릴 상대는 없습니다.</p>
          </header>

          <div className="flex flex-col gap-3">
            <p className="text-caption-3 text-muted">플레이 색상</p>
            <Segmented
              onChange={(color) => setSettings((current) => ({ ...current, color }))}
              options={COLOR_CHOICES}
              value={settings.color}
            />
            <p className="text-caption-1 text-muted-soft">흑을 고르면 AI가 1수를 둔 상태로 대국이 시작됩니다.</p>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-caption-3 text-muted">AI 난이도</p>
            <div className="flex gap-3">
              {DIFFICULTY_CHOICES.map(({ label, sub, value }) => (
                <ChoiceCard
                  key={value}
                  onClick={() => setSettings((current) => ({ ...current, difficulty: value }))}
                  selected={settings.difficulty === value}
                  sub={sub}
                  title={label}
                />
              ))}
            </div>
          </div>

          {createGameMutation.error && (
            <Caption role="alert" tone="error">
              {createGameMutation.error.message}
            </Caption>
          )}

          <div className="flex items-center gap-4">
            <Button disabled={createGameMutation.isPending} onClick={() => createGameMutation.mutate()} type="button">
              {createGameMutation.isPending ? "생성 중..." : "대국 시작"}
            </Button>
            <p className="text-caption-1 text-muted-soft max-w-[240px]">시작하면 끝까지 두거나 기권해야 합니다.</p>
          </div>
        </div>

        <div className="flex w-full flex-1 flex-col gap-6">
          {userQuery.data && (
            <div className="bg-surface-card flex flex-col gap-6 rounded-lg p-8">
              <p className="text-caption-3 text-muted">나의 기록</p>
              <div className="flex flex-wrap gap-6">
                <Stat label="완료한 대국" value={String(userQuery.data.stats.total)} />
                <Stat
                  label="승 · 패 · 무"
                  value={`${userQuery.data.stats.wins} · ${userQuery.data.stats.losses} · ${userQuery.data.stats.draws}`}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <p className="text-caption-3 text-muted">최근 대국</p>
            {games.length === 0 ? (
              <EmptyState
                body="한 판을 끝내면 여기에 결과와 복기 링크가 쌓입니다."
                title="아직 끝난 대국이 없습니다."
              />
            ) : (
              <div className="border-hairline bg-canvas flex flex-col rounded-lg border">
                {games.map((game) => (
                  <div
                    className="border-hairline-soft flex items-center gap-4 border-t px-4 py-3.5 first:border-t-0"
                    key={game.id}
                  >
                    <span
                      className={`w-[72px] shrink-0 rounded-full px-3 py-1.5 text-center text-[13px] font-medium ${RESULT_BADGE_CLASS[game.result]}`}
                    >
                      {RESULT_LABEL[game.result]}
                    </span>
                    <p className="text-body-3 text-body flex-1">
                      {ENDED_REASON_LABEL[game.endedReason]} · {COLOR_LABEL[game.color]} ·{" "}
                      {DIFFICULTY_LABEL[game.difficulty]}
                    </p>
                    <Link href={`/games/${game.id}/review`} variant="text">
                      복기
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default NewGamePage;
