"use client";

import type { OAuthProvider, UserDto } from "@ax-chess/shared";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { FormField } from "@/app/_components/ui/Form";
import { googleButtonFont } from "@/app/fonts";

// Google light theme: https://developers.google.com/identity/branding-guidelines
const googleClasses = `${googleButtonFont.className} flex min-h-12 w-full items-center justify-center gap-2.5 rounded border border-[#747775] bg-white px-3 text-sm leading-5 font-medium tracking-[0.25px] text-[#1F1F1F] hover:bg-[#F8FAFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F1F1F]`;
const googleIcon = (
  <Image
    src="/brand/google-g.png"
    alt=""
    width={20}
    height={20}
    className="size-5 shrink-0 object-contain"
    unoptimized
  />
);

const names: Record<OAuthProvider, string> = { google: "Google", kakao: "카카오" };
const messages: Record<string, string> = {
  OAUTH_SIGNUP_EXPIRED: "소셜 인증이 만료되었습니다. 다시 로그인해 주세요.",
  OAUTH_FAILED: "소셜 로그인에 실패했습니다. 다시 시도해 주세요.",
  OAUTH_DISABLED: "현재 이 소셜 로그인을 사용할 수 없습니다.",
  OAUTH_EMAIL_REQUIRED: "인증된 이메일이 있는 Google 계정으로 다시 시도해 주세요.",
  ACCOUNT_LINK_REQUIRED: "기존 로그인 방법으로 로그인한 후 프로필에서 소셜 계정을 연결해 주세요.",
  ACCOUNT_LINK_CONFLICT: "연결할 수 없는 계정입니다. 기존 계정과 같은 이메일의 소셜 계정을 선택해 주세요.",
  OAUTH_REAUTH_REQUIRED: "기존 소셜 계정으로 다시 로그인한 후 10분 이내에 프로필에서 연결해 주세요.",
  INVALID_CREDENTIALS: "비밀번호가 올바르지 않습니다.",
  UNAUTHORIZED: "다시 로그인한 후 계정을 연결해 주세요.",
};

function OAuthNotice() {
  const params = useSearchParams();
  if (params.get("withdrawn") === "1")
    return <output>회원탈퇴가 완료되었습니다. 계정과 대국 기록이 삭제되었습니다.</output>;
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
      {providers
        .filter((provider) => user || provider === "google")
        .map((provider) => {
          const connected = user?.connectedProviders.includes(provider);
          const classes =
            provider === "google"
              ? googleClasses
              : "flex min-h-12 w-full items-center justify-center rounded-sm border border-[#FEE500] bg-[#FEE500] px-4 text-[15px] font-semibold text-black/85 focus-visible:outline-2 focus-visible:outline-offset-2";
          if (user && connected)
            return (
              <p key={provider} className="text-muted text-sm">
                {names[provider]} 연결됨
                {!user.hasPassword && (
                  <a
                    className={
                      provider === "google" ? `${classes} mt-3` : "text-primary ml-3 underline focus-visible:outline-2"
                    }
                    href={`/api/auth/oauth/${provider}`}
                  >
                    {provider === "google" && googleIcon}
                    {provider === "google" ? "Google 계정으로 로그인" : `${names[provider]}로 다시 인증하기`}
                  </a>
                )}
              </p>
            );
          if (!user)
            return (
              <a className={classes} href={`/api/auth/oauth/${provider}`} key={provider}>
                {provider === "google" && googleIcon}
                {provider === "google" ? "Google 계정으로 계속" : `${names[provider]}로 계속하기`}
              </a>
            );
          return (
            <form action={`/api/auth/oauth/${provider}/link`} className="space-y-3" key={provider} method="post">
              {provider === "google" && <p className="text-muted text-sm">Google 계정을 연결하려면 계속하세요.</p>}
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
                {provider === "google" && googleIcon}
                {provider === "google" ? "Google 계정으로 계속" : `${names[provider]} 계정 연결하기`}
              </button>
            </form>
          );
        })}
    </div>
  );
}
