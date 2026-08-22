"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";

import { Button } from "@/app/_components/ui/Button";
import { Link } from "@/app/_components/ui/Link";
import { currentUserQueryKey, getCurrentUser, logout } from "@/app/_lib/api/auth";

const AuthNav = () => {
  const queryClient = useQueryClient();
  const { data: user, isPending } = useQuery({ queryFn: getCurrentUser, queryKey: currentUserQueryKey, retry: false });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => queryClient.setQueryData(currentUserQueryKey, null),
  });

  if (isPending) return null;

  return user ? (
    <>
      <Link
        className={clsx(
          "rounded-sm px-3 py-2 text-[14px] font-semibold transition-colors",
          "text-body-strong hover:text-primary-active",
        )}
        href="/games/new"
      >
        새 게임
      </Link>
      <span className="text-body-strong text-[14px] font-semibold">{user.nickname}</span>
      <Button
        disabled={logoutMutation.isPending}
        onClick={() => logoutMutation.mutate()}
        size="sm"
        type="button"
        variant="text"
      >
        로그아웃
      </Button>
    </>
  ) : (
    <>
      <Link
        className={clsx(
          "rounded-sm px-3 py-2 text-[14px] font-semibold transition-colors",
          "text-body-strong hover:text-primary-active",
        )}
        href="/login"
      >
        로그인
      </Link>
      <Link href="/sign-up" size="sm" variant="primary">
        회원가입
      </Link>
    </>
  );
};

export default AuthNav;
