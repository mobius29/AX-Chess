"use client";

import type { CreateGameRequest } from "@ax-chess/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/app/_components/ui/Button";
import { Body, Caption, Title } from "@/app/_components/ui/Typography";
import { activeGameQueryKey, createGame, getActiveGame } from "@/app/_lib/api/games";

import ChoiceGroup from "./components/ChoiceGroup";
import { COLOR_CHOICES, DIFFICULTY_CHOICES } from "./constants";

const NewGamePage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState<CreateGameRequest>({ color: "random", difficulty: "normal" });

  const activeGameQuery = useQuery({ queryFn: getActiveGame, queryKey: activeGameQueryKey });
  const createGameMutation = useMutation({
    mutationFn: () => createGame(settings),
    onSuccess: (game) => {
      queryClient.setQueryData(activeGameQueryKey, game);
      router.push(`/games/${game.id}`);
    },
  });

  useEffect(() => {
    if (activeGameQuery.data) router.replace(`/games/${activeGameQuery.data.id}`);
  }, [activeGameQuery.data, router]);

  if (activeGameQuery.isPending || activeGameQuery.data) return null;

  return (
    <section className="mx-auto w-full max-w-[520px] flex-1 px-5 py-12 md:px-10">
      <Title level={3} tone="ink">
        새 대국 시작
      </Title>
      <Body className="mt-2" tone="muted">
        색과 난이도를 고르세요. 시작 후에는 바꿀 수 없습니다.
      </Body>

      <div className="mt-8">
        <ChoiceGroup
          choices={COLOR_CHOICES}
          label="둘 색"
          onSelect={(color) => setSettings((current) => ({ ...current, color }))}
          selected={settings.color}
        />
      </div>

      <div className="mt-6">
        <ChoiceGroup
          choices={DIFFICULTY_CHOICES}
          label="난이도"
          onSelect={(difficulty) => setSettings((current) => ({ ...current, difficulty }))}
          selected={settings.difficulty}
        />
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
