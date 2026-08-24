import clsx from "clsx";
import type { SubmitEvent } from "react";

import type { ScreenState } from "../screenState";

type GameMoveActionProps = {
  errorMessage: string | null;
  moveInput: string;
  onMoveInputChange: (value: string) => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  screenState: Extract<ScreenState, "ready" | "submitting">;
};

const GameMoveAction = ({ errorMessage, moveInput, onMoveInputChange, onSubmit, screenState }: GameMoveActionProps) => {
  const isReady = screenState === "ready";

  return (
    <form className="flex w-full flex-col gap-3" onSubmit={onSubmit}>
      <label className="sr-only" htmlFor="move-input">
        다음 수
      </label>
      <div
        className={clsx(
          "bg-surface-dark-soft flex h-14 items-center gap-3 rounded-md border px-[18px]",
          !isReady && "opacity-50",
          errorMessage
            ? "border-error"
            : isReady
              ? "border-primary shadow-[0_0_0_3px_rgb(204_120_92_/_0.15)]"
              : "border-hairline-dark",
        )}
      >
        <span aria-hidden="true" className="text-primary text-[17px]">
          ▸
        </span>
        {isReady ? (
          <input
            autoComplete="off"
            autoFocus
            className="text-on-dark placeholder:text-notation-muted flex-1 bg-transparent text-[18px] outline-none"
            id="move-input"
            onChange={(e) => onMoveInputChange(e.target.value)}
            value={moveInput}
          />
        ) : (
          <p className="text-notation-muted flex-1 text-[18px]">AI가 응수를 고르는 중입니다</p>
        )}
      </div>

      {errorMessage ? (
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="bg-error size-[7px] rounded-full" />
          <p className="text-error text-body-3" role="alert">
            {errorMessage}
          </p>
        </div>
      ) : (
        <p className="text-notation-muted text-caption-1">
          SAN · UCI · O-O · e8=Q — 대소문자와 +, # 기호는 관용적으로 처리합니다.
        </p>
      )}

      <button className="sr-only" disabled={!isReady || !moveInput.trim()} type="submit">
        두기
      </button>
    </form>
  );
};

export default GameMoveAction;
