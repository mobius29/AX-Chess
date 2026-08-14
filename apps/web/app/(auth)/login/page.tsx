"use client";

import type { LoginRequest } from "@ax-chess/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { SubmitEvent } from "react";

import { Button } from "@/app/_components/ui/Button";
import { Form, FormField } from "@/app/_components/ui/Form";
import { BrandLink, Link } from "@/app/_components/ui/Link";
import { Body, Caption, Title } from "@/app/_components/ui/Typography";
import { apiRequest } from "@/app/_lib/api";
import { currentUserQueryKey } from "@/app/_lib/auth";

const LoginPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const login = useMutation({
    mutationFn: (req: LoginRequest) => apiRequest("post", "auth/login", { json: req }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: currentUserQueryKey });
      router.replace("/");
    },
  });

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (login.isPending) return;

    const values = Object.fromEntries(new FormData(e.currentTarget)) as unknown as LoginRequest;
    login.mutate(values);
  };

  return (
    <section className="w-full max-w-[380px]">
      <BrandLink className="mb-12" href="/" />

      <header className="mb-8">
        <Title level={3} tone="ink">
          다시 두었던 곳부터
        </Title>
        <Body className="mt-3" level={3} tone="muted">
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
          <Caption role="alert" tone="error">
            {login.error.message}
          </Caption>
        )}
        <Button disabled={login.isPending} type="submit">
          {login.isPending ? "로그인 중..." : "로그인"}
        </Button>
      </Form>

      <Caption className="mt-6 text-center" tone="muted">
        처음이신가요?{" "}
        <Link href="/sign-up" variant="text">
          회원가입
        </Link>
      </Caption>
    </section>
  );
};

export default LoginPage;
