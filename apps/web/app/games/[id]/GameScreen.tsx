"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SubmitEvent } from "react";

import { Button } from "@/app/_components/ui/Button";
import { Dialog } from "@/app/_components/ui/Dialog";
import { Body, Caption, Title } from "@/app/_components/ui/Typography";
import { gameQueryKey, getGame } from "@/app/_lib/api/games";
import { COLOR_LABEL, DIFFICULTY_LABEL } from "@/app/_lib/labels";

import GameFinishedDialog from "./components/GameFinishedDialog";
import GameLoadError from "./components/GameLoadError";
import GameLoading from "./components/GameLoading";
import GameMoveAction from "./components/GameMoveAction";
import GameMoveList from "./components/GameMoveList";
import useGameMutations from "./hooks/useGameMutations";
import { getScreenState } from "./screenState";

const GameScreen = ({ gameId }: { gameId: string }) => {
  const router = useRouter();

  const [moveInput, setMoveInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmingResign, setConfirmingResign] = useState(false);

  const { data: game, isPending } = useQuery({ queryFn: () => getGame(gameId), queryKey: gameQueryKey(gameId) });
  const { moveMutation, resignMutation, retryMutation } = useGameMutations(gameId, {
    onMoveSuccess: () => setMoveInput(""),
    onResignSuccess: () => setConfirmingResign(false),
    setErrorMessage,
  });

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (screenState !== "ready" || !moveInput.trim()) return;
    moveMutation.mutate(moveInput.trim());
  };

  if (isPending) return <GameLoading />;
  if (!game) return <GameLoadError />;

  const screenState = getScreenState({
    status: game.status,
    color: game.color,
    turn: game.turn,
    isSubmitting: moveMutation.isPending || retryMutation.isPending,
  });

  return (
    <section className="mx-auto flex w-full max-w-[640px] flex-1 flex-col px-5 py-8 md:px-10">
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

      <GameMoveList moves={game.moves} />

      {screenState === "engineRetry" && (
        <div className="border-hairline bg-surface-card mt-4 rounded-lg border p-5 text-center">
          <Body tone="muted">엔진이 응답하지 않았습니다. 입력하신 수는 저장되어 있습니다.</Body>
          <Button className="mt-4" disabled={retryMutation.isPending} onClick={() => retryMutation.mutate()}>
            {retryMutation.isPending ? "재요청 중..." : "AI 응수 다시 요청"}
          </Button>
        </div>
      )}

      {(screenState === "ready" || screenState === "submitting") && (
        <GameMoveAction
          moveInput={moveInput}
          onMoveInputChange={setMoveInput}
          onSubmit={handleSubmit}
          screenState={screenState}
        />
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

      {screenState === "finished" && <GameFinishedDialog game={game} onHome={() => router.push("/")} />}
    </section>
  );
};

export default GameScreen;
