"use client";

import { useEffect, useRef } from "react";

import { Caption } from "@/app/_components/ui/Typography";

type GameMoveListProps = {
  moves: string[];
};

const GameMoveList = ({ moves }: GameMoveListProps) => {
  const moveListEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    moveListEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [moves.length]);

  const rows: { no: number; white?: string; black?: string }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({ no: i / 2 + 1, white: moves[i], black: moves[i + 1] });
  }

  return (
    <div className="border-hairline bg-canvas mt-4 max-h-[360px] flex-1 overflow-y-auto rounded-lg border">
      {rows.length === 0 ? (
        <Caption level={1} className="text-muted-soft px-5 py-6">
          아직 둔 수가 없습니다.
        </Caption>
      ) : (
        <table className="w-full text-[15px]">
          <tbody>
            {rows.map(({ no, white, black }) => (
              <tr className="border-hairline-soft border-b last:border-0" key={no}>
                <td className="text-muted-soft w-12 py-2 pl-5 text-[13px]">{no}</td>
                <td className="text-ink py-2 font-medium">{white}</td>
                <td className="text-ink py-2 pr-5 font-medium">{black}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div ref={moveListEndRef} />
    </div>
  );
};

export default GameMoveList;
