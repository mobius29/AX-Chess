import type { Color } from "@ax-chess/shared";
import clsx from "clsx";
import Image from "next/image";

import { parseFenBoard } from "./parseFenBoard";

const FILES = "abcdefgh";
const RANKS = "87654321";

const pieceSrc = (piece: string) => `/pieces/${piece === piece.toUpperCase() ? "w" : "b"}${piece.toUpperCase()}.svg`;

const ReviewBoard = ({ fen, orientation }: { fen: string; orientation: Color }) => {
  const rows = parseFenBoard(fen);
  const cells = rows.flatMap((row, rowIndex) =>
    row.map((piece, colIndex) => ({
      isLight: (rowIndex + colIndex) % 2 === 0,
      piece,
      square: `${FILES[colIndex]}${RANKS[rowIndex]}`,
    })),
  );
  const displayCells = orientation === "white" ? cells : cells.toReversed();

  return (
    <div
      aria-hidden="true"
      className="border-hairline mx-auto grid aspect-square w-full max-w-[480px] grid-cols-8 grid-rows-8 overflow-hidden rounded-lg border"
    >
      {displayCells.map(({ isLight, piece, square }) => (
        <div className={clsx("flex items-center justify-center", isLight ? "bg-sq-light" : "bg-sq-dark")} key={square}>
          {piece && <Image alt="" className="w-[70%]" height={48} src={pieceSrc(piece)} unoptimized width={48} />}
        </div>
      ))}
    </div>
  );
};

export default ReviewBoard;
