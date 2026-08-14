"use client";

import type { SignUpRequest } from "@ax-chess/shared";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { SubmitEvent } from "react";

import { Button } from "@/app/_components/ui/Button";
import { Form, FormField } from "@/app/_components/ui/Form";
import { BrandLink, Link } from "@/app/_components/ui/Link";
import { Body, Caption, Title } from "@/app/_components/ui/Typography";
import { apiRequest } from "@/app/_lib/api";

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
    <section className="w-full max-w-[380px]">
      <BrandLink className="mb-12" href="/" />

      <header className="mb-8 flex flex-col gap-3">
        <Title level={3} tone="ink">
          한 판부터 시작해 보세요
        </Title>
        <Body level={3} tone="muted">
          이메일과 닉네임만 정하면 바로 둘 수 있습니다.
        </Body>
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
          {signUp.isPending ? "가입 중..." : "회원가입"}
        </Button>
      </Form>

      <Caption className="mt-6 text-center" tone="muted">
        이미 계정이 있나요?{" "}
        <Link href="/login" variant="text">
          로그인
        </Link>
      </Caption>
    </section>
  );
};

export default SignUpPage;
