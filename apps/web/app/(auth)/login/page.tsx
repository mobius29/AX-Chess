"use client";

import type { LoginRequest } from "@ax-chess/shared";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { SubmitEvent } from "react";

import { Button } from "@/app/_components/Button";
import { Form, FormField } from "@/app/_components/Form";
import { BrandLink, Link } from "@/app/_components/Link";
import { Body, Title } from "@/app/_components/Typography";
import { apiRequest } from "@/app/_lib/api";

const LoginPage = () => {
  const router = useRouter();

  const login = useMutation({
    mutationFn: (request: LoginRequest) => apiRequest("post", "auth/login", { json: request }),
    onSuccess: () => router.replace("/"),
  });

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (login.isPending) return;

    const formData = new FormData(event.currentTarget);
    login.mutate({
      email: String(formData.get("email")),
      password: String(formData.get("password")),
    });
  };

  return (
    <section className="w-full max-w-[380px]">
      <BrandLink className="mb-12" href="/" />

      <header className="mb-8">
        <Title className="text-ink" level={3}>
          다시 두었던 곳부터
        </Title>
        <Body className="text-muted mt-3" level={3}>
          진행 중이던 대국이 있으면 그대로 이어서 둘 수 있습니다.
        </Body>
      </header>

      <Form aria-busy={login.isPending} onSubmit={handleSubmit}>
        <FormField
          autoComplete="email"
          label="이메일"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
        <FormField autoComplete="current-password" label="비밀번호" name="password" required type="password" />
        {login.error && (
          <p className="text-error text-caption-1" role="alert">
            {login.error.message}
          </p>
        )}
        <Button disabled={login.isPending} type="submit">
          {login.isPending ? "로그인 중..." : "로그인"}
        </Button>
      </Form>

      <p className="text-caption-1 text-muted mt-6 text-center">
        처음이신가요?{" "}
        <Link href="/sign-up" variant="text">
          회원가입
        </Link>
      </p>
    </section>
  );
};

export default LoginPage;
