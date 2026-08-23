"use client";

import type { UserDto } from "@ax-chess/shared";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/app/_components/ui/Button";
import { Body, Caption, Title } from "@/app/_components/ui/Typography";
import { currentUserQueryKey, getCurrentUser } from "@/app/_lib/api/auth";

const STAT_LABEL: Record<keyof UserDto["stats"], string> = {
  total: "총판",
  wins: "승",
  losses: "패",
  draws: "무",
};

const ProfilePage = () => {
  const {
    data: user,
    isError,
    isPending,
    refetch,
  } = useQuery({ queryFn: getCurrentUser, queryKey: currentUserQueryKey, retry: false });

  if (isPending) {
    return <div className="bg-surface-card mx-auto mt-12 h-40 w-full max-w-[480px] animate-pulse rounded-lg" />;
  }

  if (isError || !user) {
    return (
      <section className="mx-auto mt-12 w-full max-w-[480px] px-5 md:px-10">
        <Caption role="alert" tone="error">
          프로필을 불러오지 못했습니다.
        </Caption>
        <Button className="mt-3" onClick={() => refetch()} size="sm" type="button" variant="text">
          다시 시도
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[480px] flex-1 px-5 py-12 md:px-10">
      <Title level={3} tone="ink">
        프로필
      </Title>
      <Body className="mt-2" tone="muted">
        {user.nickname} · {user.email}
      </Body>

      <dl className="border-hairline bg-surface-card mt-8 grid grid-cols-4 gap-4 rounded-lg border p-6 text-center">
        {(Object.keys(STAT_LABEL) as Array<keyof UserDto["stats"]>).map((key) => (
          <div key={key}>
            <dt className="text-caption-1 text-muted">{STAT_LABEL[key]}</dt>
            <dd className="text-title-4 text-ink mt-1 font-semibold">{user.stats[key]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

export default ProfilePage;
