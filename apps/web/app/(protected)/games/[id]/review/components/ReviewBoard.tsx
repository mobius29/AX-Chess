import type { Color } from "@ax-chess/shared";
import clsx from "clsx";

import { parseFenBoard } from "./parseFenBoard";

const PIECE_GLYPH: Record<string, string> = {
  P: "♙",
  N: "♘",
  B: "♗",
  R: "♖",
  Q: "♕",
  K: "♔",
  p: "♟",
  n: "♞",
  b: "♝",
  r: "♜",
  q: "♛",
  k: "♚",
};

const FILES = "abcdefgh";
const RANKS = "87654321"; // FEN row order: rank8 → rank1

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
      className="border-hairline mx-auto grid aspect-square w-full max-w-[420px] grid-cols-8 grid-rows-8 overflow-hidden rounded-lg border"
    >
      {displayCells.map(({ isLight, piece, square }) => (
        <div
          className={clsx(
            "flex items-center justify-center text-[clamp(20px,5vw,32px)]",
            isLight ? "bg-sq-light" : "bg-sq-dark",
          )}
          key={square}
        >
          {piece && (
            <span className={piece === piece.toUpperCase() ? "text-piece-white" : "text-piece-black"}>
              {PIECE_GLYPH[piece]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default ReviewBoard;
