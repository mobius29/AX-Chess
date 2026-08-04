import { Injectable } from "@nestjs/common";
import type { Difficulty } from "@ax-chess/shared";

/** 난이도별 Stockfish UCI_Elo (PRD FR-302). 튜닝은 이 값만 바꾼다. */
export const DIFFICULTY_ELO: Record<Difficulty, number> = {
  easy: 800,
  normal: 1100,
  hard: 1400,
};

/** 대국용 기본 사고 시간 (FR-303) */
export const MOVE_TIME_MS = 1000;

/** 복기 분석용 수당 사고 시간. 40수 기준 총 8초를 목표로 한다 */
export const ANALYSIS_TIME_MS = 200;

export interface PlyEvaluation {
  ply: number;
  /** centipawn, 백 기준 양수. 메이트는 ±10000으로 클립 */
  evalCp: number;
}

/** 엔진이 응답하지 않거나 초기화에 실패한 경우 */
export class EngineUnavailableError extends Error {
  constructor(message = "EngineUnavailable") {
    super(message);
    this.name = "EngineUnavailableError";
  }
}

@Injectable()
export class EngineService {
  /** WASM 엔진을 기동하고 UCI 핸드셰이크를 마친다. 인스턴스는 워밍 상태로 유지한다. */
  async init(): Promise<void> {
    throw new Error("Not implemented");
  }

  /** 주어진 기보에서 난이도에 맞는 다음 수를 UCI 형식으로 반환한다 */
  async bestMove(_sans: string[], _difficulty: Difficulty, _movetimeMs?: number): Promise<string> {
    throw new Error("Not implemented");
  }

  /** 전체 수순의 ply별 평가치를 계산한다 (복기 전용) */
  async evaluate(_sans: string[], _movetimeMs?: number): Promise<PlyEvaluation[]> {
    throw new Error("Not implemented");
  }

  /** 엔진 프로세스를 정리한다 */
  async dispose(): Promise<void> {
    throw new Error("Not implemented");
  }
}
