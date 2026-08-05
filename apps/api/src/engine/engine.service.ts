import type { Difficulty } from "@ax-chess/shared";
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Chess } from "chess.js";
import stockfish from "stockfish";

export const DIFFICULTY_ELO: Record<Difficulty, number> = {
  easy: 800,
  normal: 1100,
  hard: 1400,
};

export const MOVE_TIME_MS = 1000;

export const ANALYSIS_TIME_MS = 200;

export interface PlyEvaluation {
  ply: number;
  /** centipawn, 백 기준 양수. 메이트는 ±10000으로 클립 */
  evalCp: number;
}

export class EngineUnavailableError extends Error {
  constructor(message = "EngineUnavailable") {
    super(message);
    this.name = "EngineUnavailableError";
  }
}

@Injectable()
export class EngineService implements OnModuleInit, OnModuleDestroy {
  engine: stockfish.Engine | null = null;
  private evaluationQueue: Promise<void> = Promise.resolve();

  async onModuleInit() {
    await this.init();
  }

  async onModuleDestroy() {
    await this.dispose();
  }

  private async sendAndWait<T>(
    engine: stockfish.Engine,
    command: string,
    parser: (line: string) => T | undefined,
    timeoutMs = 3_000,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        engine.listener = undefined;
        reject(new EngineUnavailableError(`Stockfish timeout: ${command}`));
      }, timeoutMs);

      engine.listener = (line: string) => {
        const result = parser(line);
        if (result === undefined) return;

        clearTimeout(timer);
        engine.listener = undefined;
        resolve(result);
      };

      engine.sendCommand(command);
    });
  }

  async init(): Promise<void> {
    if (this.engine) return;
    const engine = await stockfish("lite-single");

    try {
      await this.sendAndWait(engine, "uci", (line) => (line === "uciok" ? true : undefined));
      await this.sendAndWait(engine, "isready", (line) => (line === "readyok" ? true : undefined));
      this.engine = engine;
    } catch (error) {
      engine.sendCommand("quit");
      throw error;
    }
  }

  private requireEngine(): stockfish.Engine {
    if (!this.engine) throw new EngineUnavailableError();
    return this.engine;
  }

  async bestMove(sans: string[], difficulty: Difficulty, movetimeMs: number = MOVE_TIME_MS): Promise<string> {
    const engine = this.requireEngine();
    const chess = new Chess();

    sans.forEach((san) => chess.move(san, { strict: true }));

    engine.sendCommand(`setoption name UCI_LimitStrength value true`);
    engine.sendCommand(`setoption name UCI_Elo value ${DIFFICULTY_ELO[difficulty]}`);
    await this.sendAndWait(engine, "isready", (line) => (line === "readyok" ? true : undefined));

    engine.sendCommand(`position fen ${chess.fen()}`);
    return this.sendAndWait(
      engine,
      `go movetime ${movetimeMs}`,
      (line) => {
        const match = line.match(
          /^bestmove\s+([a-h][1-8][a-h][1-8][qrbn]?)(?:\s+ponder\s+[a-h][1-8][a-h][1-8][qrbn]?)?\s*$/,
        );
        if (!match) return undefined;
        return match[1];
      },
      movetimeMs + 2_000,
    );
  }

  async evaluate(sans: string[], movetimeMs: number = ANALYSIS_TIME_MS): Promise<PlyEvaluation[]> {
    const result = this.evaluationQueue.then(async () => {
      const engine = this.requireEngine();
      const chess = new Chess();
      const evaluations: PlyEvaluation[] = [];

      if (sans.length === 0) return evaluations;

      engine.sendCommand("setoption name UCI_LimitStrength value false");
      await this.sendAndWait(engine, "isready", (line) => (line === "readyok" ? true : undefined));

      for (const [index, san] of sans.entries()) {
        chess.move(san, { strict: true });
        engine.sendCommand(`position fen ${chess.fen()}`);

        let latestEvalCp: number | undefined;

        // eslint-disable-next-line no-await-in-loop
        const evalCp = await this.sendAndWait<number | null>(
          engine,
          `go movetime ${movetimeMs}`,
          (line) => {
            const score = line.match(/\bscore (cp|mate) (-?\d+)\b/);

            if (score) {
              const value = Number(score[2]);
              const sideToMoveCp = score[1] === "cp" ? value : value > 0 ? 10_000 : -10_000;
              const whiteCp = chess.turn() === "w" ? sideToMoveCp : -sideToMoveCp;

              latestEvalCp = Math.max(-10_000, Math.min(10_000, whiteCp));
            }

            return line.startsWith("bestmove ") ? (latestEvalCp ?? null) : undefined;
          },
          movetimeMs + 2_000,
        );

        if (evalCp === null) throw new EngineUnavailableError(`Stockfish score missing at ply ${index + 1}`);
        evaluations.push({ ply: index + 1, evalCp });
      }

      return evaluations;
    });

    this.evaluationQueue = result.then(
      () => undefined,
      () => undefined,
    );

    return result;
  }

  async dispose(): Promise<void> {
    const engine = this.engine;
    if (!engine) return;

    this.engine = null;

    engine.listener = undefined;
    engine.sendCommand("stop");
    engine.sendCommand("quit");
  }
}
