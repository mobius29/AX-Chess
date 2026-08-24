"use client";

import type { GameListResponse } from "@ax-chess/shared";
import { useInfiniteQuery } from "@tanstack/react-query";

import { AppNav } from "@/app/_components/layout/AppNav";
import { Button } from "@/app/_components/ui/Button";
import { Body, Caption, Title } from "@/app/_components/ui/Typography";
import { gamesListQueryKey, getGames } from "@/app/_lib/api/games";

import GameSummaryCard from "./components/GameSummaryCard";

const RecordsPage = () => {
  const query = useInfiniteQuery({
    getNextPageParam: (lastPage: GameListResponse) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => getGames(pageParam),
    queryKey: gamesListQueryKey,
  });

  const games = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      <AppNav />
      <section className="mx-auto w-full max-w-[720px] flex-1 px-5 py-12 md:px-10">
        <Title level={3} tone="ink">
          대국 기록
        </Title>

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
            <ul className="mt-8 flex flex-col gap-3">
              {games.map((game) => (
                <GameSummaryCard game={game} key={game.id} />
              ))}
            </ul>

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
