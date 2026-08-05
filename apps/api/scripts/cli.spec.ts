import { ChessService } from "../src/chess/chess.service";
import { playGame } from "./cli";

describe("CLI", () => {
  it("사용자와 AI가 체크메이트까지 대국한다", async () => {
    const inputs = ["f3", "g4"];
    const aiMoves = ["e7e5", "d8h4"];
    const engine = { bestMove: jest.fn(async () => aiMoves.shift()!) };
    const output: string[] = [];

    await playGame(
      engine,
      async () => inputs.shift()!,
      (message) => output.push(message),
      new ChessService(),
    );

    expect(engine.bestMove).toHaveBeenCalledTimes(2);
    expect(output).toContain("AI 승리 (checkmate)");
    expect(output).toContain("기보: f3 e5 g4 Qh4#");
  });
});
