"use client";

import type { ColorChoice, Difficulty } from "@ax-chess/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/app/_components/ui/Button";
import { Body, Caption, Title } from "@/app/_components/ui/Typography";
import { activeGameQueryKey, createGame, getActiveGame } from "@/app/_lib/games";

const COLOR_CHOICES: { label: string; value: ColorChoice }[] = [
  { label: "백", value: "white" },
  { label: "흑", value: "black" },
  { label: "무작위", value: "random" },
];

const DIFFICULTY_CHOICES: { label: string; value: Difficulty }[] = [
  { label: "쉬움", value: "easy" },
  { label: "보통", value: "normal" },
  { label: "어려움", value: "hard" },
];

const OptionButton = ({ onClick, label, selected }: { label: string; onClick: () => void; selected: boolean }) => (
  <button
    aria-pressed={selected}
    className={clsx(
      "border-hairline rounded-sm border px-5 py-3 text-[15px] font-semibold transition-colors",
      selected ? "bg-primary text-white" : "bg-canvas text-body-strong hover:bg-surface-soft",
    )}
    onClick={onClick}
    type="button"
  >
    {label}
  </button>
);

const NewGamePage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [color, setColor] = useState<ColorChoice>("random");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");

  // 이미 진행 중인 대국이 있으면 새 게임 폼 대신 그 대국으로 곧장 보낸다.
  const activeGameQuery = useQuery({ queryFn: getActiveGame, queryKey: activeGameQueryKey });

  const createGameMutation = useMutation({
    mutationFn: () => createGame(color, difficulty),
    onSuccess: (game) => {
      queryClient.setQueryData(activeGameQueryKey, game);
      router.push(`/games/${game.id}`);
    },
  });

  if (activeGameQuery.isPending) return null;

  if (activeGameQuery.data) {
    router.replace(`/games/${activeGameQuery.data.id}`);
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-[520px] flex-1 px-5 py-12 md:px-10">
      <Title level={3} tone="ink">
        새 대국 시작
      </Title>
      <Body className="mt-2" tone="muted">
        색과 난이도를 고르세요. 시작 후에는 바꿀 수 없습니다.
      </Body>

      <div className="mt-8">
        <p className="text-body-strong mb-3 text-[13px] font-medium">둘 색</p>
        <div className="flex flex-wrap gap-2">
          {COLOR_CHOICES.map((choice) => (
            <OptionButton
              key={choice.value}
              label={choice.label}
              onClick={() => setColor(choice.value)}
              selected={color === choice.value}
            />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-body-strong mb-3 text-[13px] font-medium">난이도</p>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTY_CHOICES.map((choice) => (
            <OptionButton
              key={choice.value}
              label={choice.label}
              onClick={() => setDifficulty(choice.value)}
              selected={difficulty === choice.value}
            />
          ))}
        </div>
      </div>

      {createGameMutation.error && (
        <Caption className="mt-6" role="alert" tone="error">
          {createGameMutation.error.message}
        </Caption>
      )}

      <Button
        className="mt-8"
        disabled={createGameMutation.isPending}
        onClick={() => createGameMutation.mutate()}
        type="button"
      >
        {createGameMutation.isPending ? "생성 중..." : "게임 시작"}
      </Button>
    </section>
  );
};

export default NewGamePage;
