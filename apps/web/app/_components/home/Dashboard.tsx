"use client";

import { useQuery } from "@tanstack/react-query";

import { Link } from "@/app/_components/ui/Link";
import { Body, Title } from "@/app/_components/ui/Typography";
import { activeGameQueryKey, getActiveGame } from "@/app/_lib/games";
import { COLOR_LABEL, DIFFICULTY_LABEL } from "@/app/_lib/labels";

/** 로그인 상태의 홈. 이어할 대국이 있으면 카드로, 없으면 새 게임 시작을 유도한다. */
const Dashboard = () => {
  const { data: activeGame, isPending } = useQuery({ queryFn: getActiveGame, queryKey: activeGameQueryKey });

  return (
    <section className="mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center px-5 py-12 md:px-10">
      {isPending ? (
        <div className="bg-surface-card h-40 animate-pulse rounded-lg" />
      ) : activeGame ? (
        <div className="border-hairline bg-surface-card rounded-lg border p-8">
          <Title level={3} tone="ink">
            진행 중인 대국이 있습니다
          </Title>
          <Body className="mt-2" tone="muted">
            {COLOR_LABEL[activeGame.color]} · {DIFFICULTY_LABEL[activeGame.difficulty]} · {activeGame.moveCount}수 진행
          </Body>
          <Link className="mt-6" href={`/games/${activeGame.id}`} variant="primary">
            이어하기
          </Link>
        </div>
      ) : (
        <div className="border-hairline bg-surface-card rounded-lg border p-8">
          <Title level={3} tone="ink">
            새 대국을 시작하세요
          </Title>
          <Body className="mt-2" tone="muted">
            색과 난이도를 고르면 바로 시작할 수 있습니다.
          </Body>
          <Link className="mt-6" href="/games/new" variant="primary">
            새 게임 시작
          </Link>
        </div>
      )}
    </section>
  );
};

export default Dashboard;
