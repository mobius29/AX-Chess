"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/app/_components/ui/Avatar";
import { BrandLink } from "@/app/_components/ui/Link";
import { currentUserQueryKey, getCurrentUser, logout } from "@/app/_lib/api/auth";

const NAV_LINKS = [
  { href: "/", label: "홈" },
  { href: "/records", label: "내 기록" },
];

const AppNav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: user } = useQuery({ queryFn: getCurrentUser, queryKey: currentUserQueryKey, retry: false });
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(currentUserQueryKey, null);
      router.replace("/login");
    },
  });

  if (!user) return null;

  return (
    <div className="border-hairline-soft bg-canvas sticky top-0 z-10 border-b">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-5 md:px-10">
        <div className="flex items-center gap-8">
          <BrandLink href="/" />
          <nav aria-label="메뉴" className="hidden items-center gap-6 sm:flex">
            {NAV_LINKS.map(({ href, label }) => (
              <NextLink
                className={clsx("text-body-3", pathname === href ? "text-ink" : "text-muted")}
                href={href}
                key={href}
              >
                {label}
              </NextLink>
            ))}
          </nav>
        </div>

        <div className="relative">
          <button
            className="flex cursor-pointer items-center gap-3"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            <span className="text-body-3 text-muted">{user.nickname}</span>
            <Avatar nickname={user.nickname} />
          </button>

          {menuOpen && (
            <>
              <button
                aria-hidden="true"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setMenuOpen(false)}
                tabIndex={-1}
                type="button"
              />
              <div className="border-hairline bg-canvas absolute top-full right-0 z-20 mt-2 w-40 rounded-lg border py-1 shadow-lg">
                <NextLink
                  className="text-body-3 text-body hover:bg-surface-soft block px-4 py-2"
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                >
                  프로필
                </NextLink>
                <button
                  className="text-body-3 text-body hover:bg-surface-soft block w-full cursor-pointer px-4 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={logoutMutation.isPending}
                  onClick={() => logoutMutation.mutate()}
                  type="button"
                >
                  로그아웃
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppNav;
