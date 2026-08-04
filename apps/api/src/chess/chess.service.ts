import { Injectable } from "@nestjs/common";
import { Chess } from "chess.js";
import type { EndedReason } from "@ax-chess/shared";

/** 규칙에 맞지 않는 수. 실패 사유는 담지 않는다 (FR-204). */
export class IllegalMoveError extends Error {
  constructor() {
    super("IllegalMove");
    this.name = "IllegalMoveError";
  }
}

export interface AppliedMove {
  /** 정규화된 SAN. 입력이 UCI였어도 SAN으로 반환한다 */
  san: string;
}

export interface Outcome {
  /** 무승부면 null */
  winner: "w" | "b" | null;
  reason: EndedReason;
}

@Injectable()
export class ChessService {
  /** 저장된 SAN 목록을 replay해 보드를 재구성한다. 서버 내부 전용. */
  replay(_sans: string[]): Chess {
    throw new Error("Not implemented");
  }

  /**
   * 현재 기보에 입력 수를 적용한다.
   * SAN과 UCI를 모두 받으며, 규칙 위반이면 IllegalMoveError를 던진다.
   */
  applyMove(_sans: string[], _input: string): AppliedMove {
    throw new Error("Not implemented");
  }

  /** 종료 조건을 판정한다. 진행 중이면 null. */
  getOutcome(_chess: Chess): Outcome | null {
    throw new Error("Not implemented");
  }
}
