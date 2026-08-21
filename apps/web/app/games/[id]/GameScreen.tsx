"use client";

import type { ResignResponse, SubmitMoveResponse } from "@ax-chess/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/app/_components/ui/Button";
import { Dialog } from "@/app/_components/ui/Dialog";
import { Body, Caption, Title } from "@/app/_components/ui/Typography";
import type { ApiRequestError } from "@/app/_lib/api";
import { activeGameQueryKey, gameQueryKey, getGame, resignGame, retryAiMove, submitMove } from "@/app/_lib/games";
import { COLOR_LABEL, DIFFICULTY_LABEL, ENDED_REASON_LABEL, RESULT_LABEL } from "@/app/_lib/labels";

type ScreenState = "loading" | "ready" | "submitting" | "engineRetry" | "finished" | "error";

const GameScreen = ({ gameId }: { gameId: string }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [moveInput, setMoveInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmingResign, setConfirmingResign] = useState(false);
  const moveListEndRef = useRef<HTMLDivElement>(null);

  const gameQuery = useQuery({ queryFn: () => getGame(gameId), queryKey: gameQueryKey(gameId) });
  const game = gameQuery.data;

  const moveMutation = useMutation<SubmitMoveResponse, ApiRequestError, string>({
    mutationFn: (move: string) => submitMove(gameId, move),
    onSuccess: (data) => {
      queryClient.setQueryData(gameQueryKey(gameId), data);
      setMoveInput("");
      setErrorMessage(null);
      if (data.status === "finished") queryClient.invalidateQueries({ queryKey: activeGameQueryKey });
    },
    onError: (error: ApiRequestError) => {
      setErrorMessage(error.message);
      // 턴/상태 충돌은 화면이 낡았을 수 있으니 다시 받아온다. ILLEGAL_MOVE와 엔진 실패는 그대로 둔다.
      if (error.code !== "ILLEGAL_MOVE" && error.code !== "ENGINE_UNAVAILABLE") {
        queryClient.invalidateQueries({ queryKey: gameQueryKey(gameId) });
      }
    },
  });

  const retryMutation = useMutation<SubmitMoveResponse, ApiRequestError, void>({
    mutationFn: () => retryAiMove(gameId),
    onSuccess: (data) => {
      queryClient.setQueryData(gameQueryKey(gameId), data);
      moveMutation.reset();
      setErrorMessage(null);
    },
    onError: (error: ApiRequestError) => setErrorMessage(error.message),
  });

  const resignMutation = useMutation<ResignResponse, ApiRequestError, void>({
    mutationFn: () => resignGame(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gameQueryKey(gameId) });
      queryClient.invalidateQueries({ queryKey: activeGameQueryKey });
      setConfirmingResign(false);
    },
  });

  useEffect(() => {
    moveListEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [game?.moves.length]);

  const screenState: ScreenState = gameQuery.isPending
    ? "loading"
    : !game
      ? "error"
      : game.status === "finished"
        ? "finished"
        : moveMutation.isPending || retryMutation.isPending
          ? "submitting"
          : moveMutation.error?.code === "ENGINE_UNAVAILABLE"
            ? "engineRetry"
            : "ready";

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (screenState !== "ready" || !moveInput.trim()) return;
    moveMutation.mutate(moveInput.trim());
  };

  if (screenState === "loading") {
    return (
      <section className="mx-auto w-full max-w-[640px] flex-1 px-5 py-12 md:px-10">
        <div className="bg-surface-card h-96 animate-pulse rounded-lg" />
      </section>
    );
  }

  if (screenState === "error" || !game) {
    return (
      <section className="mx-auto w-full max-w-[640px] flex-1 px-5 py-12 md:px-10">
        <Caption role="alert" tone="error">
          대국 정보를 불러오지 못했습니다.
        </Caption>
      </section>
    );
  }

  const rows: { black?: string; no: number; white?: string }[] = [];
  for (let i = 0; i < game.moves.length; i += 2) {
    rows.push({ black: game.moves[i + 1], no: i / 2 + 1, white: game.moves[i] });
  }

  return (
    <section className="mx-auto flex w-full max-w-[640px] flex-1 flex-col px-5 py-8 md:px-10">
      {/* 상태 바 — 턴 · 색 · 난이도 · 총 수 · 실착수 */}
      <div className="border-hairline bg-surface-card flex flex-wrap items-center justify-between gap-3 rounded-lg border px-5 py-4">
        <div>
          <Title level={4} tone="ink">
            {COLOR_LABEL[game.color]} · {DIFFICULTY_LABEL[game.difficulty]}
          </Title>
          <Body className="mt-1" level={3} tone="muted">
            {game.turn ? `${COLOR_LABEL[game.turn]}의 차례` : "게임 종료"} · {game.moveCount}수 · 실착수{" "}
            {game.illegalCount}
          </Body>
        </div>
        <Button onClick={() => setConfirmingResign(true)} size="sm" type="button" variant="text">
          기권
        </Button>
      </div>

      {game.inCheck && (
        <div className="bg-error/10 text-error mt-4 rounded-sm px-4 py-2 text-[14px] font-semibold" role="alert">
          체크!
        </div>
      )}

      {/* 기보 리스트 — 번호 · 백 · 흑 2열, 최신 수로 자동 스크롤 */}
      <div className="border-hairline bg-canvas mt-4 max-h-[360px] flex-1 overflow-y-auto rounded-lg border">
        {rows.length === 0 ? (
          <p className="text-caption-1 text-muted-soft px-5 py-6">아직 둔 수가 없습니다.</p>
        ) : (
          <table className="w-full text-[15px]">
            <tbody>
              {rows.map((row) => (
                <tr className="border-hairline-soft border-b last:border-0" key={row.no}>
                  <td className="text-muted-soft w-12 py-2 pl-5 text-[13px]">{row.no}</td>
                  <td className="text-ink py-2 font-medium">{row.white}</td>
                  <td className="text-ink py-2 pr-5 font-medium">{row.black}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div ref={moveListEndRef} />
      </div>

      {/* 수 입력 */}
      {screenState === "engineRetry" ? (
        <div className="border-hairline bg-surface-card mt-4 rounded-lg border p-5 text-center">
          <Body tone="muted">엔진이 응답하지 않았습니다. 입력하신 수는 저장되어 있습니다.</Body>
          <Button className="mt-4" disabled={retryMutation.isPending} onClick={() => retryMutation.mutate()}>
            {retryMutation.isPending ? "재시도 중..." : "AI 응수 다시 요청"}
          </Button>
        </div>
      ) : (
        <form className="mt-4 flex gap-2" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="move-input">
            다음 수
          </label>
          <input
            autoComplete="off"
            autoFocus
            className="border-hairline bg-canvas text-ink placeholder:text-muted-soft focus:border-primary h-12 flex-1 rounded-sm border px-4 text-[16px] outline-none focus:shadow-[0_0_0_3px_rgb(204_120_92_/_0.15)] disabled:opacity-50"
            disabled={screenState !== "ready"}
            id="move-input"
            onChange={(e) => setMoveInput(e.target.value)}
            placeholder={screenState === "submitting" ? "AI가 생각 중..." : "예: Nf3, e4, O-O"}
            value={moveInput}
          />
          <Button disabled={screenState !== "ready" || !moveInput.trim()} type="submit">
            두기
          </Button>
        </form>
      )}

      {errorMessage && screenState !== "engineRetry" && (
        <Caption className="mt-3" role="alert" tone="error">
          {errorMessage}
        </Caption>
      )}

      <Dialog onClose={() => setConfirmingResign(false)} open={confirmingResign}>
        <Title level={4} tone="ink">
          기권하시겠습니까?
        </Title>
        <Body className="mt-2" tone="muted">
          기권하면 대국이 즉시 종료되고 되돌릴 수 없습니다.
        </Body>
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={() => setConfirmingResign(false)} size="sm" type="button" variant="text">
            취소
          </Button>
          <Button disabled={resignMutation.isPending} onClick={() => resignMutation.mutate()} size="sm" type="button">
            {resignMutation.isPending ? "처리 중..." : "기권"}
          </Button>
        </div>
      </Dialog>

      <Dialog open={game.status === "finished"}>
        <Title level={3} tone="ink">
          {game.result && RESULT_LABEL[game.result]}
        </Title>
        <Body className="mt-2" tone="muted">
          {game.endedReason && ENDED_REASON_LABEL[game.endedReason]} · {game.moveCount}수 · 실착수 {game.illegalCount}
        </Body>
        <Button className="mt-6" onClick={() => router.push("/")} type="button">
          홈으로
        </Button>
      </Dialog>
    </section>
  );
};

export default GameScreen;
