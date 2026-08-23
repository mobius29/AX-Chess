import type { SubmitEvent } from "react";

import { Button } from "@/app/_components/ui/Button";
import { Input } from "@/app/_components/ui/Input";

import type { ScreenState } from "../screenState";

type GameMoveActionProps = {
  moveInput: string;
  onMoveInputChange: (value: string) => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  screenState: Extract<ScreenState, "ready" | "submitting">;
};

const GameMoveAction = ({ moveInput, onMoveInputChange, onSubmit, screenState }: GameMoveActionProps) => {
  const isReady = screenState === "ready";
  return (
    <form className="mt-4 flex gap-2" onSubmit={onSubmit}>
      <label className="sr-only" htmlFor="move-input">
        다음 수
      </label>
      <Input
        id="move-input"
        className="h-12 flex-1 px-4 text-[16px]"
        value={moveInput}
        onChange={(e) => onMoveInputChange(e.target.value)}
        disabled={!isReady}
        placeholder={isReady ? "예: Nf3, e4, O-O" : "AI가 생각 중..."}
        autoComplete="off"
        autoFocus
      />
      <Button disabled={!isReady || !moveInput.trim()} type="submit">
        두기
      </Button>
    </form>
  );
};

export default GameMoveAction;
