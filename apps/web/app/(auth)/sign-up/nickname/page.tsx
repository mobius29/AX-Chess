import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { oauthSignupCookie } from "@/app/_lib/auth/sessionCookies";

import NicknameForm from "./NicknameForm";

export default async function OAuthNicknamePage() {
  if (!(await cookies()).has(oauthSignupCookie())) redirect("/login?error=OAUTH_SIGNUP_EXPIRED");

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <section className="w-full max-w-[384px]">
        <header className="mb-7 space-y-2">
          <p className="text-primary text-sm font-semibold">소셜 인증 완료</p>
          <h1 className="text-title-2 text-ink font-semibold">어떤 이름으로 둘까요?</h1>
          <p className="text-body-3 text-muted">대국에서 사용할 닉네임을 정하면 가입이 완료됩니다.</p>
        </header>
        <NicknameForm />
      </section>
    </div>
  );
}
