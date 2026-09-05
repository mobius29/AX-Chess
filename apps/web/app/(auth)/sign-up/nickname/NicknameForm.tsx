"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/app/_components/ui/Button";
import { Form, FormField } from "@/app/_components/ui/Form";
import { Link } from "@/app/_components/ui/Link";
import { Caption } from "@/app/_components/ui/Typography";

export default function NicknameForm() {
  const [nickname, setNickname] = useState("");
  const [checkedNickname, setCheckedNickname] = useState("");
  const signup = useMutation({
    mutationFn: async (action: "nickname" | "complete") => {
      const response = await fetch(action === "nickname" ? "/api/auth/nickname/check" : "/api/auth/oauth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname }),
      });
      const result = await response.json();
      if (result.code === "OAUTH_SIGNUP_EXPIRED") throw new Error("소셜 인증이 만료되었습니다. 다시 로그인해 주세요.");
      if (!response.ok)
        throw new Error(typeof result.message === "string" ? result.message : "닉네임을 확인해 주세요.");
      if (action === "nickname" && !result.available) throw new Error("이미 사용 중인 닉네임입니다.");
    },
    onSuccess: (_result, action) => {
      if (action === "nickname") setCheckedNickname(nickname);
      else window.location.assign("/");
    },
    onError: () => setCheckedNickname(""),
  });
  const available = nickname !== "" && nickname === checkedNickname;

  return (
    <Form
      aria-busy={signup.isPending}
      onSubmit={(event) => {
        event.preventDefault();
        if (available && !signup.isPending) signup.mutate("complete");
      }}
    >
      <FormField
        autoComplete="nickname"
        disabled={signup.isPending}
        hint="한글, 영문, 숫자, 밑줄 2–16자"
        label="닉네임"
        maxLength={16}
        minLength={2}
        name="nickname"
        pattern="[a-zA-Z0-9가-힣_]{2,16}"
        required
        value={nickname}
        onChange={(event) => {
          setNickname(event.target.value);
          setCheckedNickname("");
          signup.reset();
        }}
      />
      <Button
        disabled={signup.isPending || !/^[a-zA-Z0-9가-힣_]{2,16}$/.test(nickname)}
        onClick={() => signup.mutate("nickname")}
        type="button"
        variant="text"
      >
        {signup.isPending && signup.variables === "nickname" ? "확인 중..." : "닉네임 중복 확인"}
      </Button>
      <div aria-live="polite">
        {available && <p className="text-primary text-sm">사용할 수 있는 닉네임입니다.</p>}
        {signup.error && (
          <Caption role="alert" tone="error">
            {signup.error.message}
          </Caption>
        )}
      </div>
      <Button disabled={!available || signup.isPending} type="submit">
        {signup.isPending && signup.variables === "complete" ? "가입 중..." : "가입하고 시작하기"}
      </Button>
      <Link className="w-full" href="/login" size="sm" variant="secondary">
        로그인으로 돌아가기
      </Link>
    </Form>
  );
}
