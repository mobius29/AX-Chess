"use client";

import { useQuery } from "@tanstack/react-query";

import { Body, Title } from "@/app/_components/ui/Typography";
import { currentUserQueryKey, getCurrentUser } from "@/app/_lib/api/auth";

const STAT_LABEL = ["총판", "승", "패", "무"] as const;

const ProfilePage = () => {
  const { data: user, isPending } = useQuery({ queryFn: getCurrentUser, queryKey: currentUserQueryKey });

  if (isPending) {
    return <div className="bg-surface-card mx-auto mt-12 h-40 w-full max-w-[480px] animate-pulse rounded-lg" />;
  }
  if (!user) return null;

  const values = [user.stats.total, user.stats.wins, user.stats.losses, user.stats.draws];

  return (
    <section className="mx-auto w-full max-w-[480px] flex-1 px-5 py-12 md:px-10">
      <Title level={3} tone="ink">
        프로필
      </Title>
      <Body className="mt-2" tone="muted">
        {user.nickname} · {user.email}
      </Body>

      <dl className="border-hairline bg-surface-card mt-8 grid grid-cols-4 gap-4 rounded-lg border p-6 text-center">
        {STAT_LABEL.map((label, i) => (
          <div key={label}>
            <dt className="text-caption-1 text-muted">{label}</dt>
            <dd className="text-title-4 text-ink mt-1 font-semibold">{values[i]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

export default ProfilePage;
