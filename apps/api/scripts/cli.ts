import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

import { ChessService, IllegalMoveError } from "../src/chess/chess.service";
import { EngineService } from "../src/engine/engine.service";

type CliEngine = Pick<EngineService, "bestMove">;

export async function playGame(
  engine: CliEngine,
  question: (prompt: string) => Promise<string>,
  write: (message: string) => void = console.log,
  chess = new ChessService(),
): Promise<void> {
  const sans: string[] = [];

  write("AX Chess CLI — 사용자: 백 / AI: 흑 / 난이도: normal");

  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const input = (await question("수를 입력하세요 (SAN/UCI, quit 종료): ")).trim();

    if (["quit", "exit"].includes(input.toLowerCase())) {
      write("게임을 종료합니다.");
      return;
    }

    try {
      const move = chess.applyMove(sans, input);
      sans.push(move.san);
      write(`사용자: ${move.san}`);
    } catch (error) {
      if (!(error instanceof IllegalMoveError)) throw error;
      write("불법 수입니다. 다시 입력하세요.");
      continue;
    }

    let outcome = chess.getOutcome(chess.replay(sans));
    if (outcome) {
      write(outcome.winner === "w" ? `사용자 승리 (${outcome.reason})` : `무승부 (${outcome.reason})`);
      write(`기보: ${sans.join(" ")}`);
      return;
    }

    write("AI가 생각 중입니다...");
    // eslint-disable-next-line no-await-in-loop
    const aiMove = chess.applyMove(sans, await engine.bestMove(sans, "normal")).san;
    sans.push(aiMove);
    write(`AI: ${aiMove}`);

    outcome = chess.getOutcome(chess.replay(sans));
    if (outcome) {
      write(outcome.winner === "b" ? `AI 승리 (${outcome.reason})` : `무승부 (${outcome.reason})`);
      write(`기보: ${sans.join(" ")}`);
      return;
    }
  }
}

async function main(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });
  const engine = new EngineService();
  const controller = new AbortController();
  const onSigint = () => controller.abort();

  process.once("SIGINT", onSigint);

  try {
    await engine.init();
    await playGame(engine, (prompt) => rl.question(prompt, { signal: controller.signal }));
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.log("\n게임을 종료합니다.");
    } else {
      console.error(error);
      process.exitCode = 1;
    }
  } finally {
    process.off("SIGINT", onSigint);
    rl.close();
    await engine.dispose();
  }
}

if (require.main === module) void main();
