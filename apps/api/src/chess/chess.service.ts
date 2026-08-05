import type { EndedReason } from "@ax-chess/shared";
import { Injectable } from "@nestjs/common";
import { Chess } from "chess.js";

export class IllegalMoveError extends Error {
  constructor() {
    super("IllegalMove");
    this.name = "IllegalMoveError";
  }
}

export interface AppliedMove {
  san: string;
}

export interface Outcome {
  winner: "w" | "b" | null;
  reason: EndedReason;
}

@Injectable()
export class ChessService {
  replay(sans: string[]): Chess {
    const chess = new Chess();
    sans.forEach((san) => chess.move(san, { strict: true }));

    return chess;
  }

  applyMove(sans: string[], input: string): AppliedMove {
    const board = this.replay(sans);
    const normalizedInput = input
      .trim()
      .replace(/^[A-H](?=[1-8])/, (file) => file.toLowerCase())
      .replace(/=[qrbn]/, (promotion) => promotion.toUpperCase());

    try {
      const move = board.move(normalizedInput);
      return { san: move.san };
    } catch {
      throw new IllegalMoveError();
    }
  }

  getOutcome(chess: Chess): Outcome | null {
    if (chess.isCheckmate()) return { winner: chess.turn() === "w" ? "b" : "w", reason: "checkmate" };
    if (chess.isStalemate()) return { winner: null, reason: "stalemate" };
    if (chess.isThreefoldRepetition()) return { winner: null, reason: "threefold" };
    if (chess.isDrawByFiftyMoves()) return { winner: null, reason: "fifty_move" };
    if (chess.isInsufficientMaterial()) return { winner: null, reason: "insufficient_material" };

    return null;
  }
}
