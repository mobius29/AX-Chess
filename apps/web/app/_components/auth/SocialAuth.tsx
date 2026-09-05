"use client";

import type { OAuthProvider, UserDto } from "@ax-chess/shared";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { FormField } from "@/app/_components/ui/Form";

const names: Record<OAuthProvider, string> = { google: "Google", kakao: "카카오" };
const messages: Record<string, string> = {
  OAUTH_SIGNUP_EXPIRED: "소셜 인증이 만료되었습니다. 다시 로그인해 주세요.",
  OAUTH_FAILED: "소셜 로그인에 실패했습니다. 다시 시도해 주세요.",
  OAUTH_DISABLED: "현재 이 소셜 로그인을 사용할 수 없습니다.",
  OAUTH_EMAIL_REQUIRED: "소셜 계정의 인증된 이메일이 필요합니다. 이메일로 가입하거나 로그인해 주세요.",
  ACCOUNT_LINK_REQUIRED: "기존 로그인 방법으로 로그인한 후 프로필에서 소셜 계정을 연결해 주세요.",
  ACCOUNT_LINK_CONFLICT: "연결할 수 없는 계정입니다. 기존 계정과 같은 이메일의 소셜 계정을 선택해 주세요.",
  OAUTH_REAUTH_REQUIRED: "기존 소셜 계정으로 다시 로그인한 후 10분 이내에 프로필에서 연결해 주세요.",
  INVALID_CREDENTIALS: "비밀번호가 올바르지 않습니다.",
  UNAUTHORIZED: "다시 로그인한 후 계정을 연결해 주세요.",
};

function OAuthNotice() {
  const params = useSearchParams();
  const error = params.get("error");
  if (error && Object.hasOwn(messages, error))
    return (
      <p className="text-sm text-red-700" role="alert">
        {messages[error]}
      </p>
    );
  if (params.get("linked") === "1") return <output className="text-primary text-sm">소셜 계정을 연결했습니다.</output>;
  return null;
}

export function SocialAuth({ user }: { user?: UserDto }) {
  const { data: providers = [] } = useQuery<OAuthProvider[]>({
    queryKey: ["oauthProviders"],
    staleTime: 60_000,
    queryFn: async () => {
      const response = await fetch("/api/auth/oauth/providers");
      if (!response.ok) return [];
      return response.json();
    },
  });

  return (
    <div className="mt-6 space-y-3">
      <Suspense>
        <OAuthNotice />
      </Suspense>
      {user && providers.length > 0 && <h2 className="text-ink text-sm font-semibold">소셜 계정 연결</h2>}
      {providers.map((provider) => {
        const connected = user?.connectedProviders.includes(provider);
        const classes = `flex min-h-12 w-full items-center justify-center rounded-sm border px-4 text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 ${provider === "kakao" ? "border-[#FEE500] bg-[#FEE500] text-black/85" : "border-[#747775] bg-white text-[#1F1F1F]"}`;
        if (user && connected)
          return (
            <p key={provider} className="text-muted text-sm">
              {names[provider]} 연결됨
              {!user.hasPassword && (
                <a className="text-primary ml-3 underline focus-visible:outline-2" href={`/api/auth/oauth/${provider}`}>
                  {names[provider]}로 다시 인증하기
                </a>
              )}
            </p>
          );
        if (!user)
          return (
            <a className={classes} href={`/api/auth/oauth/${provider}`} key={provider}>
              {names[provider]}로 계속하기
            </a>
          );
        return (
          <form action={`/api/auth/oauth/${provider}/link`} className="space-y-3" key={provider} method="post">
            {user.hasPassword && (
              <FormField
                autoComplete="current-password"
                id={`${provider}-password`}
                label={`${names[provider]} 연결을 위한 현재 비밀번호`}
                maxLength={1024}
                name="password"
                required
                type="password"
              />
            )}
            <button className={`${classes} cursor-pointer`} type="submit">
              {names[provider]} 계정 연결하기
            </button>
          </form>
        );
      })}
    </div>
  );
}
