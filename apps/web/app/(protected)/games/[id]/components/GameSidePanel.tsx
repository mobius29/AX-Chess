import type { Color, Difficulty } from "@ax-chess/shared";
import clsx from "clsx";

import { COLOR_LABEL, DIFFICULTY_LABEL } from "@/app/_lib/labels";

import type { ScreenState } from "../screenState";

const TURN_LABEL: Record<ScreenState, string> = {
  engineRetry: "AI 응수 재시도 필요",
  finished: "대국 종료",
  ready: "내 차례",
  submitting: "AI 응수 계산 중",
};

type GameSidePanelProps = {
  color: Color;
  difficulty: Difficulty;
  illegalCount: number;
  inCheck: boolean;
  moveCount: number;
  onResign: () => void;
  screenState: ScreenState;
};

const GameSidePanel = ({
  color,
  difficulty,
  illegalCount,
  inCheck,
  moveCount,
  onResign,
  screenState,
}: GameSidePanelProps) => {
  const metaRows = [
    { label: "내 색상", value: COLOR_LABEL[color] },
    { label: "난이도", value: DIFFICULTY_LABEL[difficulty] },
    { label: "총 수", value: `${moveCount}수` },
    { label: "실착수", value: `${illegalCount}회`, highlight: illegalCount > 0 },
  ];

  return (
    <div className="border-hairline-dark flex h-full w-full flex-col justify-between border-l px-7 py-8 md:w-[296px]">
      <div className="flex flex-col gap-6">
        <div className="bg-surface-dark-elevated border-hairline-dark flex items-center gap-2.5 rounded-md border px-3.5 py-3">
          <span aria-hidden="true" className="bg-primary size-[7px] rounded-full" />
          <p className="text-on-dark text-[14px] font-medium">{TURN_LABEL[screenState]}</p>
        </div>

        {inCheck && screenState !== "finished" && (
          <div className="bg-primary border-primary rounded-md border px-3.5 py-3">
            <p className="text-[14px] font-medium text-white">체크 — 킹이 공격받는 중</p>
          </div>
        )}

        <div className="flex flex-col">
          {metaRows.map(({ highlight, label, value }) => (
            <div className="border-hairline-dark flex items-center justify-between border-b py-2.5" key={label}>
              <p className="text-caption-1 text-on-dark-soft">{label}</p>
              <p className={clsx("text-body-3", highlight ? "text-primary" : "text-on-dark")}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-caption-1 text-notation-muted">대국을 벗어나는 경로는 기권뿐입니다.</p>
        <button
          className="border-error text-error hover:bg-error/10 h-10 w-full rounded-md border text-[14px] font-semibold transition-colors"
          onClick={onResign}
          type="button"
        >
          기권하기
        </button>
      </div>
    </div>
  );
};

export default GameSidePanel;
