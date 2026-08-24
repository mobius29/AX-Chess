"use client";

import type { LoginRequest } from "@ax-chess/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { SubmitEvent } from "react";

import { AuthDivider, AuthPanel } from "@/app/_components/auth";
import { Button } from "@/app/_components/ui/Button";
import { Form, FormField } from "@/app/_components/ui/Form";
import { Link } from "@/app/_components/ui/Link";
import { MoveListPreview } from "@/app/_components/ui/MoveListPreview";
import { Caption } from "@/app/_components/ui/Typography";
import { apiRequest } from "@/app/_lib/api/apiClient";
import { currentUserQueryKey } from "@/app/_lib/api/auth";

const MOVE_LIST = [
  { black: "e5", no: 1, white: "e4" },
  { black: "Nc6", no: 2, white: "Nf3" },
  { black: "a6", no: 3, white: "Bb5" },
  { black: "Nf6", no: 4, white: "Ba4" },
  { black: "Be7", no: 5, white: "O-O" },
  { black: "b5", no: 6, white: "Re1" },
  { black: "d6", no: 7, white: "Bb3" },
];

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
    <div className="flex w-full">
      <div className="flex flex-1 items-center justify-center px-6 py-16 md:px-14">
        <section className="w-full max-w-[384px]">
          <header className="mb-7 flex flex-col gap-2">
            <h1 className="text-title-2 text-ink font-semibold">다시 두었던 것부터.</h1>
            <p className="text-body-3 text-muted">진행 중이던 대국이 있으면 그대로 이어서 둘 수 있습니다.</p>
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

          <div className="mt-7 flex flex-col gap-4">
            <AuthDivider text="아직 계정이 없나요?" />
            <Link className="w-full" href="/sign-up" size="sm" variant="secondary">
              이메일로 가입하기
            </Link>
          </div>
        </section>
      </div>

      <AuthPanel
        body={<MoveListPreview highlightLast rows={MOVE_LIST} />}
        eyebrow="진행 중인 대국"
        footer="로그인하면 기보가 그대로 복원됩니다. 보드는 여전히 없습니다."
        title={
          <>
            14수째.
            <br />
            백, Normal.
          </>
        }
      />
    </div>
  );
};

export default LoginPage;
