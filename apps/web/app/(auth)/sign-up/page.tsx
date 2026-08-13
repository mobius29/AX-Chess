"use client";

import type { SignUpRequest } from "@ax-chess/shared";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { SubmitEvent } from "react";

import { Button } from "@/app/_components/Button";
import { Form, FormField } from "@/app/_components/Form";
import { BrandLink, Link } from "@/app/_components/Link";
import { Body, Title } from "@/app/_components/Typography";
import { apiRequest } from "@/app/_lib/api";

const SignUpPage = () => {
  const router = useRouter();
  const signUp = useMutation({
    mutationFn: (request: SignUpRequest) => apiRequest("post", "auth/signup", { json: request }),
    onSuccess: () => router.replace("/login"),
  });

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (signUp.isPending) return;

    const formData = new FormData(event.currentTarget);
    signUp.mutate({
      email: String(formData.get("email")),
      nickname: String(formData.get("nickname")),
      password: String(formData.get("password")),
    });
  };

  return (
    <section className="w-full max-w-[380px]">
      <BrandLink className="mb-12" href="/" />

      <header className="mb-8 flex flex-col gap-3">
        <Title level={3} className="text-ink">
          한 판부터 시작해 보세요
        </Title>
        <Body level={3} className="text-muted">
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
          <p className="text-error text-caption-1" role="alert">
            {signUp.error.message}
          </p>
        )}
        <Button disabled={signUp.isPending} type="submit">
          {signUp.isPending ? "가입 중..." : "회원가입"}
        </Button>
      </Form>

      <p className="text-caption-1 text-muted mt-6 text-center">
        이미 계정이 있나요?{" "}
        <Link href="/login" variant="text">
          로그인
        </Link>
      </p>
    </section>
  );
};

export default SignUpPage;
