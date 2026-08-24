"use client";

import type { GameListResponse } from "@ax-chess/shared";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { AppNav } from "@/app/_components/layout/AppNav";
import { Badge } from "@/app/_components/ui/Badge";
import { Button } from "@/app/_components/ui/Button";
import { Body, Caption, Title } from "@/app/_components/ui/Typography";
import { currentUserQueryKey, getCurrentUser } from "@/app/_lib/api/auth";
import { gamesListQueryKey, getGames } from "@/app/_lib/api/games";

import GameSummaryCard from "./components/GameSummaryCard";

const RecordsPage = () => {
  const userQuery = useQuery({ queryFn: getCurrentUser, queryKey: currentUserQueryKey, retry: false });
  const query = useInfiniteQuery({
    getNextPageParam: (lastPage: GameListResponse) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => getGames(pageParam),
    queryKey: gamesListQueryKey,
  });

  const games = query.data?.pages.flatMap((page) => page.items) ?? [];
  const stats = userQuery.data?.stats;

  return (
    <>
      <AppNav />
      <section className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-14 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Title level={2} tone="ink">
              끝난 대국 {stats ? `${stats.total}판` : ""}
            </Title>
            <Body className="mt-2" level={3} tone="muted">
              최신순입니다. 각 행에서 바로 복기로 갈 수 있습니다.
            </Body>
          </div>
          {stats && (
            <div className="flex gap-2">
              <Badge variant="win">{stats.wins}승</Badge>
              <Badge variant="loss">{stats.losses}패</Badge>
              <Badge variant="default">{stats.draws}무</Badge>
            </div>
          )}
        </div>

        {query.isPending ? (
          <div className="bg-surface-card mt-8 h-40 animate-pulse rounded-lg" />
        ) : query.isError ? (
          <div className="mt-8">
            <Caption role="alert" tone="error">
              대국 기록을 불러오지 못했습니다.
            </Caption>
            <Button className="mt-3" onClick={() => query.refetch()} size="sm" type="button" variant="text">
              다시 시도
            </Button>
          </div>
        ) : games.length === 0 ? (
          <Body className="mt-8" tone="muted">
            아직 끝난 대국이 없습니다.
          </Body>
        ) : (
          <>
            <div className="border-hairline bg-canvas mt-8 overflow-x-auto rounded-lg border">
              <div className="min-w-[820px]">
                <div className="bg-surface-soft text-muted-soft flex items-center gap-4 px-5 py-3">
                  <p className="text-caption-3 w-[64px] shrink-0">결과</p>
                  <p className="text-caption-3 min-w-0 flex-1">종료 사유</p>
                  <p className="text-caption-3 w-[90px] shrink-0">난이도</p>
                  <p className="text-caption-3 w-[60px] shrink-0">색상</p>
                  <p className="text-caption-3 w-[130px] shrink-0">총 수 · 실착수</p>
                  <p className="text-caption-3 w-[110px] shrink-0">종료 시각</p>
                  <p className="text-caption-3 w-[48px] shrink-0" />
                </div>
                <div>
                  {games.map((game) => (
                    <GameSummaryCard game={game} key={game.id} />
                  ))}
                </div>
              </div>
            </div>

            {query.hasNextPage && (
              <Button
                className="mt-6"
                disabled={query.isFetchingNextPage}
                onClick={() => query.fetchNextPage()}
                size="sm"
                type="button"
                variant="text"
              >
                {query.isFetchingNextPage ? "불러오는 중..." : "더 보기"}
              </Button>
            )}
          </>
        )}
      </section>
    </>
  );
};

export default RecordsPage;
