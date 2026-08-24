"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { AppNav } from "@/app/_components/layout/AppNav";
import { Avatar } from "@/app/_components/ui/Avatar";
import { Button } from "@/app/_components/ui/Button";
import { Stat } from "@/app/_components/ui/Stat";
import { Body, Caption, Title } from "@/app/_components/ui/Typography";
import { currentUserQueryKey, getCurrentUser, logout } from "@/app/_lib/api/auth";

const ProfilePage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: user,
    isError,
    isPending,
    refetch,
  } = useQuery({ queryFn: getCurrentUser, queryKey: currentUserQueryKey, retry: false });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(currentUserQueryKey, null);
      router.replace("/login");
    },
  });

  return (
    <>
      <AppNav />

      {isPending ? (
        <div className="bg-surface-card mx-auto mt-12 h-40 w-full max-w-[840px] animate-pulse rounded-lg" />
      ) : isError || !user ? (
        <section className="mx-auto mt-12 w-full max-w-[840px] px-5 md:px-10">
          <Caption role="alert" tone="error">
            프로필을 불러오지 못했습니다.
          </Caption>
          <Button className="mt-3" onClick={() => refetch()} size="sm" type="button" variant="text">
            다시 시도
          </Button>
        </section>
      ) : (
        <section className="mx-auto w-full max-w-[840px] flex-1 px-5 py-14 md:px-10">
          <div className="flex items-center gap-6">
            <Avatar className="size-14 text-[16px]" nickname={user.nickname} />
            <div>
              <Title level={2} tone="ink">
                {user.nickname}
              </Title>
              <Body className="mt-1" level={3} tone="muted">
                {user.email}
              </Body>
            </div>
          </div>

          <div className="bg-surface-card mt-8 flex gap-6 rounded-lg p-6">
            <Stat label="총 게임" value={String(user.stats.total)} />
            <Stat label="승 · 패 · 무" value={`${user.stats.wins} · ${user.stats.losses} · ${user.stats.draws}`} />
          </div>

          <div className="mt-8 flex flex-col">
            <div className="border-hairline-soft flex items-center justify-between border-b py-3.5">
              <Body level={3} tone="muted">
                닉네임
              </Body>
              <p className="text-title-5 text-ink">{user.nickname}</p>
            </div>
            <div className="flex items-center justify-between py-3.5">
              <Body level={3} tone="muted">
                이메일
              </Body>
              <p className="text-title-5 text-ink">{user.email}</p>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <Button
              className="border-hairline rounded-md border px-5 py-2.5"
              disabled={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
              size="sm"
              type="button"
              variant="text"
            >
              로그아웃
            </Button>
          </div>
        </section>
      )}
    </>
  );
};

export default ProfilePage;
