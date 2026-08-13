"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Link } from "@/app/_components/ui/Link";
import { currentUserQueryKey, getCurrentUser, logout } from "@/app/_lib/auth";

const AuthNav = () => {
  const queryClient = useQueryClient();
  const { data: user, isPending } = useQuery({
    queryFn: getCurrentUser,
    queryKey: currentUserQueryKey,
    retry: false,
  });
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => queryClient.setQueryData(currentUserQueryKey, null),
  });

  if (isPending) return null;
  if (user) {
    return (
      <>
        <span className="text-body-strong text-[14px] font-semibold">{user.nickname}</span>
        <button
          className="text-muted hover:text-primary-active focus-visible:outline-primary rounded-sm px-3 py-2 text-[14px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={logoutMutation.isPending}
          onClick={() => logoutMutation.mutate()}
          type="button"
        >
          {logoutMutation.isPending ? "로그아웃 중..." : "로그아웃"}
        </button>
      </>
    );
  }

  return (
    <>
      <Link
        className="text-body-strong hover:text-primary-active focus-visible:outline-primary rounded-sm px-3 py-2 text-[14px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        href="/login"
      >
        로그인
      </Link>
      <Link className="h-auto px-4 py-2.5 text-[14px]" href="/sign-up" variant="primary">
        회원가입
      </Link>
    </>
  );
};

export default AuthNav;
