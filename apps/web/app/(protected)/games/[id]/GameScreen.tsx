"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { SubmitEvent } from "react";

import { Button } from "@/app/_components/ui/Button";
import { Dialog } from "@/app/_components/ui/Dialog";
import { Body, Title } from "@/app/_components/ui/Typography";
import { gameQueryKey, getGame } from "@/app/_lib/api/games";

import GameFinishedDialog from "./components/GameFinishedDialog";
import GameLoadError from "./components/GameLoadError";
import GameLoading from "./components/GameLoading";
import GameMoveAction from "./components/GameMoveAction";
import GameMoveList from "./components/GameMoveList";
import GameNav from "./components/GameNav";
import GameSidePanel from "./components/GameSidePanel";
import useGameMutations from "./hooks/useGameMutations";
import { getScreenState } from "./screenState";

const GameScreen = ({ gameId }: { gameId: string }) => {
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
    color: game.color,
    isSubmitting: moveMutation.isPending || retryMutation.isPending,
    status: game.status,
    turn: game.turn,
  });

  return (
    <div className="bg-surface-dark flex w-full flex-1 flex-col">
      <GameNav color={game.color} difficulty={game.difficulty} />

      <div className="flex w-full flex-1 flex-col md:flex-row">
        <div className="flex w-full flex-1 flex-col justify-between gap-8 overflow-hidden px-6 py-8 md:px-12 md:pt-10 md:pb-8">
          <GameMoveList moves={game.moves} />

          {screenState === "engineRetry" && (
            <div className="bg-surface-dark-soft border-hairline-dark flex flex-col items-center gap-4 rounded-md border p-6 text-center">
              <p className="text-notation-muted text-body-3">
                엔진이 응답하지 않았습니다. 입력하신 수는 저장되어 있습니다.
              </p>
              <Button disabled={retryMutation.isPending} onClick={() => retryMutation.mutate()} type="button">
                {retryMutation.isPending ? "재요청 중..." : "AI 응수 다시 요청"}
              </Button>
            </div>
          )}

          {(screenState === "ready" || screenState === "submitting") && (
            <GameMoveAction
              errorMessage={errorMessage}
              moveInput={moveInput}
              onMoveInputChange={setMoveInput}
              onSubmit={handleSubmit}
              screenState={screenState}
            />
          )}
        </div>

        <GameSidePanel
          color={game.color}
          difficulty={game.difficulty}
          illegalCount={game.illegalCount}
          inCheck={game.inCheck}
          moveCount={game.moveCount}
          onResign={() => setConfirmingResign(true)}
          screenState={screenState}
        />
      </div>

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

      {screenState === "finished" && <GameFinishedDialog game={game} />}
    </div>
  );
};

export default GameScreen;
