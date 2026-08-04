import { Chess } from "chess.js";

import {
  ANALYSIS_TIME_MS,
  DIFFICULTY_ELO,
  EngineService,
  EngineUnavailableError,
  MOVE_TIME_MS,
} from "./engine.service";

/** 실제 WASM 엔진을 구동하므로 기본 타임아웃으로는 부족하다 */
jest.setTimeout(60_000);

/** 5. Qxf7+?? Kxf7 — 백이 퀸을 그냥 버린다 */
const QUEEN_BLUNDER = ["e4", "e5", "Qh5", "Nc6", "Qxf7+", "Kxf7"];

/** 주어진 기보에서 UCI 문자열이 실제 합법수인지 확인한다 */
function isLegalUci(sans: string[], uci: string): boolean {
  const chess = new Chess();
  for (const san of sans) chess.move(san);
  try {
    chess.move(uci);
    return true;
  } catch {
    return false;
  }
}

describe("EngineService", () => {
  describe("난이도 상수 (FR-302)", () => {
    it("PRD가 정한 Elo 값을 쓴다", () => {
      expect(DIFFICULTY_ELO).toEqual({ easy: 800, normal: 1100, hard: 1400 });
    });

    it("난이도가 올라갈수록 Elo가 높다", () => {
      expect(DIFFICULTY_ELO.easy).toBeLessThan(DIFFICULTY_ELO.normal);
      expect(DIFFICULTY_ELO.normal).toBeLessThan(DIFFICULTY_ELO.hard);
    });

    it("대국 사고 시간이 FR-303의 상한을 넘지 않는다", () => {
      expect(MOVE_TIME_MS).toBeLessThanOrEqual(1000);
    });

    it("복기 분석은 40수를 10초 안에 끝낼 수 있는 시간을 쓴다", () => {
      // PRD 8.2: 복기 분석 40수 기준 10초 이내
      expect(ANALYSIS_TIME_MS * 40).toBeLessThanOrEqual(10_000);
    });
  });

  describe("초기화 전", () => {
    it("bestMove 호출은 EngineUnavailableError를 던진다", async () => {
      const service = new EngineService();

      await expect(service.bestMove([], "normal")).rejects.toThrow(EngineUnavailableError);
    });

    it("evaluate 호출은 EngineUnavailableError를 던진다", async () => {
      const service = new EngineService();

      await expect(service.evaluate(["e4"])).rejects.toThrow(EngineUnavailableError);
    });
  });

  describe("구동 후", () => {
    let service: EngineService;

    beforeAll(async () => {
      service = new EngineService();
      await service.init();
    });

    afterAll(async () => {
      await service.dispose();
    });

    it("init을 두 번 불러도 실패하지 않는다", async () => {
      await expect(service.init()).resolves.not.toThrow();
    });

    describe("bestMove (FR-301)", () => {
      it("시작 포지션에서 합법수를 반환한다", async () => {
        const move = await service.bestMove([], "normal");

        expect(move).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/);
        expect(isLegalUci([], move)).toBe(true);
      });

      it.each(["easy", "normal", "hard"] as const)("%s 난이도에서 합법수를 반환한다", async (difficulty) => {
        // 난이도별 "수의 강도" 비교는 확률적이라 테스트로 고정하지 않는다.
        // 여기서는 각 난이도가 엔진을 깨뜨리지 않는지만 본다.
        const sans = ["e4", "e5"];
        const move = await service.bestMove(sans, difficulty);

        expect(isLegalUci(sans, move)).toBe(true);
      });

      it("진행 중인 기보를 이어받아 자기 차례의 수를 낸다", async () => {
        const sans = ["e4", "e5", "Nf3"];
        const move = await service.bestMove(sans, "normal");

        // 흑 차례이므로 흑 기물이 움직여야 한다
        const chess = new Chess();
        for (const san of sans) chess.move(san);
        const applied = chess.move(move);

        expect(applied.color).toBe("b");
      });

      it("지정한 movetime을 크게 넘기지 않는다", async () => {
        const start = Date.now();
        await service.bestMove([], "normal", 300);
        const elapsed = Date.now() - start;

        // WASM 기동분을 감안해 넉넉히 잡는다. 무한정 생각하지 않는지만 본다.
        expect(elapsed).toBeLessThan(3000);
      });

      it("연속 호출해도 정상 동작한다", async () => {
        // 엔진 인스턴스를 워밍 상태로 재사용하므로 상태가 오염되면 안 된다
        const first = await service.bestMove(["e4"], "normal");
        const second = await service.bestMove(["e4"], "normal");

        expect(isLegalUci(["e4"], first)).toBe(true);
        expect(isLegalUci(["e4"], second)).toBe(true);
      });
    });

    describe("evaluate (FR-504)", () => {
      it("수마다 평가치를 하나씩 반환한다", async () => {
        const sans = ["e4", "e5", "Nf3"];
        const evaluations = await service.evaluate(sans, 100);

        expect(evaluations).toHaveLength(sans.length);
        expect(evaluations.map((e) => e.ply)).toEqual([1, 2, 3]);
      });

      it("빈 기보는 빈 배열을 반환한다", async () => {
        await expect(service.evaluate([], 100)).resolves.toEqual([]);
      });

      it("평가치는 정수 centipawn이다", async () => {
        const evaluations = await service.evaluate(["e4", "e5"], 100);

        for (const { evalCp } of evaluations) {
          expect(Number.isInteger(evalCp)).toBe(true);
          expect(Math.abs(evalCp)).toBeLessThanOrEqual(10_000);
        }
      });

      it("퀸을 버린 수 뒤에는 평가가 흑 쪽으로 크게 기운다", async () => {
        // 백 기준 양수 규약이므로, 백이 퀸을 잃으면 음수로 내려가야 한다
        const evaluations = await service.evaluate(QUEEN_BLUNDER, 200);
        const afterCapture = evaluations.at(-1);

        expect(afterCapture).toBeDefined();
        expect(afterCapture!.evalCp).toBeLessThan(-300);
      });

      it("같은 기보를 두 번 분석하면 비슷한 값이 나온다", async () => {
        // 완전 결정론은 아니므로 부호와 대략적 크기만 본다
        const sans = ["e4", "e5", "Qh5", "Nc6", "Qxf7+", "Kxf7"];
        const [first, second] = await Promise.all([service.evaluate(sans, 200), service.evaluate(sans, 200)]);

        const a = first.at(-1)!.evalCp;
        const b = second.at(-1)!.evalCp;

        expect(Math.sign(a)).toBe(Math.sign(b));
        expect(Math.abs(a - b)).toBeLessThan(300);
      });
    });
  });

  describe("dispose", () => {
    it("정리 후에는 다시 쓸 수 없다", async () => {
      const service = new EngineService();
      await service.init();
      await service.dispose();

      await expect(service.bestMove([], "normal")).rejects.toThrow(EngineUnavailableError);
    });

    it("초기화하지 않은 인스턴스를 정리해도 실패하지 않는다", async () => {
      const service = new EngineService();

      await expect(service.dispose()).resolves.not.toThrow();
    });
  });
});
