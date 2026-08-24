"use client";

import type { SignUpRequest } from "@ax-chess/shared";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { SubmitEvent } from "react";

import { AuthDivider, AuthPanel } from "@/app/_components/auth";
import { BulletList } from "@/app/_components/ui/BulletList";
import { Button } from "@/app/_components/ui/Button";
import { Form, FormField } from "@/app/_components/ui/Form";
import { Link } from "@/app/_components/ui/Link";
import { Caption } from "@/app/_components/ui/Typography";
import { apiRequest } from "@/app/_lib/api/apiClient";

const BULLETS = ["중단한 대국 이어하기", "종료된 대국 복기 · 엔진 분석", "실착수와 정확도 추적"];

const SignUpPage = () => {
  const router = useRouter();
  const signUp = useMutation({
    mutationFn: (request: SignUpRequest) => apiRequest("post", "auth/signup", { json: request }),
    onSuccess: () => router.replace("/login"),
  });

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (signUp.isPending) return;

    const values = Object.fromEntries(new FormData(e.currentTarget)) as unknown as SignUpRequest;
    signUp.mutate(values);
  };

  return (
    <div className="flex w-full">
      <div className="flex flex-1 items-center justify-center px-6 py-16 md:px-14">
        <section className="w-full max-w-[384px]">
          <header className="mb-7 flex flex-col gap-2">
            <h1 className="text-title-2 text-ink font-semibold">첫 판까지 30초.</h1>
            <p className="text-body-3 text-muted">이메일만 있으면 됩니다. 소셜 로그인은 지원하지 않습니다.</p>
          </header>

          <Form aria-busy={signUp.isPending} onSubmit={handleSubmit}>
            <FormField
              autoComplete="email"
              label="이메일"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
            <FormField
              autoComplete="nickname"
              hint="한글, 영문, 숫자, 밑줄 2–16자"
              label="닉네임"
              maxLength={16}
              minLength={2}
              name="nickname"
              required
            />
            <FormField
              autoComplete="new-password"
              hint="8자 이상"
              label="비밀번호"
              minLength={8}
              name="password"
              required
              type="password"
            />
            {signUp.error && (
              <Caption role="alert" tone="error">
                {signUp.error.message}
              </Caption>
            )}
            <Button disabled={signUp.isPending} type="submit">
              {signUp.isPending ? "가입 중..." : "가입하고 시작하기"}
            </Button>
          </Form>

          <div className="mt-7 flex flex-col gap-4">
            <AuthDivider text="이미 계정이 있나요?" />
            <Link className="w-full" href="/login" size="sm" variant="secondary">
              로그인
            </Link>
          </div>
        </section>
      </div>

      <AuthPanel
        body={<BulletList items={BULLETS} />}
        eyebrow="가입 후에 할 수 있는 것"
        footer="비로그인 상태로는 대국을 시작할 수 없습니다."
        title={
          <>
            기록이
            <br />
            남습니다.
          </>
        }
      />
    </div>
  );
};

export default SignUpPage;
