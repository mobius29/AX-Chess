"use client";

import type { UserDto } from "@ax-chess/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { Button } from "@/app/_components/ui/Button";
import { FormField } from "@/app/_components/ui/Form";
import { ApiRequestError } from "@/app/_lib/api/apiRequest";
import { deleteAccount } from "@/app/_lib/api/auth";

export function DeleteAccount({ user }: { user: UserDto }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => deleteAccount(user.hasPassword ? password : undefined),
    onSuccess: async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
      // A full navigation also discards the protected router cache.
      window.location.replace("/login?withdrawn=1");
    },
    onSettled: () => {
      submitting.current = false;
    },
  });
  const error = mutation.error;
  const message =
    error instanceof ApiRequestError
      ? error.code === "OAUTH_REAUTH_REQUIRED"
        ? "연결된 소셜 계정으로 다시 로그인한 뒤 10분 이내에 프로필에서 탈퇴해 주세요."
        : error.message
      : error
        ? "처리 결과를 확인하지 못했습니다. 다시 로그인하여 계정 상태를 확인해 주세요."
        : null;

  return (
    <div className="mt-8">
      <Button
        type="button"
        variant="text"
        size="sm"
        onClick={() => {
          setPassword("");
          setAgreed(false);
          mutation.reset();
          dialog.current?.showModal();
        }}
      >
        회원탈퇴
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby="withdraw-title"
        aria-describedby="withdraw-description"
        className="bg-canvas text-ink m-auto w-[calc(100%-2.5rem)] max-w-[420px] rounded-lg p-6 shadow-xl backdrop:bg-black/50"
        onCancel={(event) => {
          if (submitting.current) event.preventDefault();
        }}
        onClose={() => setPassword("")}
      >
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!agreed || submitting.current) return;
            submitting.current = true;
            mutation.mutate();
          }}
        >
          <h2 id="withdraw-title" className="text-title-3 font-semibold">
            회원탈퇴
          </h2>
          <p id="withdraw-description" className="text-sm">
            {user.nickname}님의 계정, 소셜 연결 정보, 모든 대국과 기보·복기 기록이 즉시 삭제되며 복구할 수 없습니다.
            소셜 제공자의 계정은 삭제되지 않습니다.
          </p>
          {user.hasPassword ? (
            <FormField
              id="withdraw-password"
              name="password"
              label="현재 비밀번호"
              type="password"
              autoComplete="current-password"
              maxLength={1024}
              required
              value={password}
              disabled={mutation.isPending}
              onChange={(event) => setPassword(event.target.value)}
            />
          ) : (
            <p className="text-muted text-sm">
              최근 10분 이내의 소셜 로그인이 필요합니다. 재로그인 링크는 프로필의 소셜 계정 연결 영역에 있습니다.
            </p>
          )}
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              required
              checked={agreed}
              disabled={mutation.isPending}
              onChange={(event) => setAgreed(event.target.checked)}
            />
            삭제되는 정보와 복구 불가 안내를 확인했습니다.
          </label>
          {message && (
            <p role="alert" className="text-sm text-red-700">
              {message}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="text"
              size="sm"
              disabled={mutation.isPending}
              onClick={() => dialog.current?.close()}
            >
              취소
            </Button>
            <Button type="submit" size="sm" disabled={!agreed || mutation.isPending}>
              {mutation.isPending ? "탈퇴 처리 중…" : "영구 삭제하고 탈퇴"}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
