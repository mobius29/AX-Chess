"use client";

import { useEffect, useRef } from "react";

type GameMoveListProps = {
  moves: string[];
};

const GameMoveList = ({ moves }: GameMoveListProps) => {
  const moveListEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    moveListEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [moves.length]);

  const rows: { black?: string; no: number; white: string }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({ black: moves[i + 1], no: i / 2 + 1, white: moves[i] ?? "" });
  }

  return (
    <div className="flex w-full flex-1 flex-col gap-1 overflow-y-auto text-[17px] leading-[2.15]">
      {rows.length === 0 ? (
        <p className="text-notation-muted text-[14px]">아직 둔 수가 없습니다.</p>
      ) : (
        rows.map(({ black, no, white }, i) => {
          const isLast = i === rows.length - 1;
          return (
            <div className="flex items-center" key={no}>
              <span className="text-notation-muted w-[46px] shrink-0 text-[14px]">{no}.</span>
              <span className={isLast ? "text-primary flex-1" : "text-on-dark flex-1"}>{white}</span>
              <span className={isLast ? "text-primary flex-1" : "text-on-dark flex-1"}>{black}</span>
            </div>
          );
        })
      )}
      <div ref={moveListEndRef} />
    </div>
  );
};

export default GameMoveList;
