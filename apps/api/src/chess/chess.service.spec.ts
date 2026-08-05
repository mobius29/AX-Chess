import { Chess } from "chess.js";

import { ChessService, IllegalMoveError } from "./chess.service";

/**
 * 모든 픽스처는 chess.js 1.4로 실제 결과를 확인한 뒤 넣었다.
 * 수순을 고칠 때는 기대 결과도 다시 확인할 것.
 */
const FIXTURES = {
  /** 1. f3 e5 2. g4 Qh4# */
  foolsMate: ["f3", "e5", "g4", "Qh4#"],
  /** 백이 흑을 스테일메이트로 몰아넣는 최단 수순 중 하나 */
  stalemate: [
    "e3",
    "a5",
    "Qh5",
    "Ra6",
    "Qxa5",
    "h5",
    "Qxc7",
    "Rah6",
    "h4",
    "f6",
    "Qxd7+",
    "Kf7",
    "Qxb7",
    "Qd3",
    "Qxb8",
    "Qh7",
    "Qxc8",
    "Kg6",
    "Qe6",
  ],
  /** 나이트 왕복으로 같은 포지션 3회 */
  threefold: ["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"],
  /** 백 c7 폰이 승격 직전. c8이 비어 있어 직진 승격이 가능하다 */
  beforePromotion: ["d4", "e5", "dxe5", "d6", "exd6", "Bf5", "dxc7", "Nd7"],
  /** 흑이 d5로 두 칸 전진한 직후. 백 e5 폰이 앙파상 가능 */
  beforeEnPassant: ["e4", "a6", "e5", "d5"],
  /** 백이 킹사이드 캐슬링 가능한 상태 */
  beforeCastle: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"],
} as const;

/** 킹 대 킹 */
const FEN_INSUFFICIENT_MATERIAL = "8/8/8/4k3/8/8/4K3/8 w - - 0 1";
/** halfmove clock 99. 한 수 더 두면 50수 규칙 성립 */
const FEN_BEFORE_FIFTY_MOVE = "4k3/8/8/8/8/8/4K3/R7 w - - 99 60";
/** Ra8+로 체크를 걸 수 있고, 흑에게 피할 수가 3개 남는다 */
const FEN_BEFORE_CHECK = "4k3/8/8/8/8/8/8/R3K3 w - - 0 1";

describe("ChessService", () => {
  let service: ChessService;

  beforeEach(() => {
    service = new ChessService();
  });

  describe("replay", () => {
    it("빈 기보는 시작 포지션을 반환한다", () => {
      const chess = service.replay([]);

      expect(chess.fen()).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    });

    it("저장된 수순을 순서대로 재현한다", () => {
      const chess = service.replay(["e4", "e5", "Nf3"]);

      expect(chess.history()).toEqual(["e4", "e5", "Nf3"]);
      expect(chess.turn()).toBe("b");
    });

    it("입력 배열을 변형하지 않는다", () => {
      const sans = ["e4", "e5"];
      service.replay(sans);

      expect(sans).toEqual(["e4", "e5"]);
    });

    it("40수 재현이 5ms 안에 끝난다", () => {
      // 매 요청마다 replay하는 설계라 이 비용이 성능 논의 대상이 되면 안 된다 (PRD 8.2)
      const sans = Array.from({ length: 5 }, () => FIXTURES.threefold).flat();
      expect(sans).toHaveLength(40);

      const start = performance.now();
      service.replay(sans);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(5);
    });
  });

  describe("applyMove — 입력 문법 (FR-202)", () => {
    it.each([
      ["SAN 폰", [], "e4", "e4"],
      ["SAN 기물", ["e4", "e5"], "Nf3", "Nf3"],
      ["UCI 폰", [], "e2e4", "e4"],
      ["UCI 기물", ["e4", "e5"], "g1f3", "Nf3"],
    ])("%s: %s → %s", (_label, setup, input, expected) => {
      expect(service.applyMove([...setup], input).san).toBe(expected);
    });

    it.each([
      ["O-O", "O-O"],
      ["0-0 (숫자 영)", "0-0"],
      ["UCI e1g1", "e1g1"],
    ])("캐슬링 %s를 받는다", (_label, input) => {
      const move = service.applyMove([...FIXTURES.beforeCastle], input);

      expect(move.san).toBe("O-O");
    });

    it.each([
      ["SAN", "exd6"],
      ["UCI", "e5d6"],
    ])("앙파상 %s를 받는다", (_label, input) => {
      const move = service.applyMove([...FIXTURES.beforeEnPassant], input);

      expect(move.san).toBe("exd6");
    });

    it.each([
      ["SAN 퀸 승격", "c8=Q", "c8=Q"],
      ["SAN 나이트 승격", "c8=N", "c8=N"],
      ["UCI 퀸 승격", "c7c8q", "c8=Q"],
      ["UCI 나이트 승격", "c7c8n", "c8=N"],
    ])("%s를 받는다", (_label, input, expected) => {
      const move = service.applyMove([...FIXTURES.beforePromotion], input);

      expect(move.san).toBe(expected);
    });

    it("승격 기물을 사용자가 고를 수 있다 — 퀸으로 강제하지 않는다", () => {
      const knight = service.applyMove([...FIXTURES.beforePromotion], "c8=N");

      expect(knight.san).toBe("c8=N");
    });

    it.each([
      ["대문자 SAN", [], "E4", "e4"],
      ["소문자 승격 기물", FIXTURES.beforePromotion, "c8=q", "c8=Q"],
      ["앞뒤 공백", [], "  e4  ", "e4"],
    ])("관용 처리: %s", (_label, setup, input, expected) => {
      // chess.js 1.4는 이 셋을 그대로 거부한다. 서비스가 입력을 정규화해야 한다.
      expect(service.applyMove([...setup], input).san).toBe(expected);
    });

    it("불필요하게 붙인 체크 기호를 받아준다", () => {
      // 이건 chess.js가 이미 관용 처리한다. 정규화 과정에서 깨뜨리지 않는지 확인한다.
      const move = service.applyMove(["e4", "e5", "Bc4", "Nc6"], "Qh5+");

      expect(move.san).toBe("Qh5");
    });

    it("입력이 UCI여도 SAN으로 정규화해 반환한다", () => {
      // moves 테이블에는 항상 SAN만 저장한다 (DB 설계서 3.3)
      const move = service.applyMove([], "e2e4");

      expect(move.san).toBe("e4");
    });
  });

  describe("applyMove — 불법 수 (FR-203, FR-204)", () => {
    it.each([
      ["규칙 위반", [], "e5"],
      ["존재하지 않는 칸", [], "zz99"],
      ["빈 문자열", [], ""],
      ["상대 기물 이동", [], "e7e5"],
      ["상대 턴에 입력", ["f3", "e5", "g4"], "a3"],
      ["체크 방치", ["e4", "e5", "Qh5", "Nf6", "Qxe5+"], "a6"],
    ])("%s는 IllegalMoveError를 던진다", (_label, setup, input) => {
      expect(() => service.applyMove([...setup], input)).toThrow(IllegalMoveError);
    });

    it("에러 메시지에 실패 사유를 담지 않는다", () => {
      // 재시도가 무료이므로 상세 메시지는 보드 스캔 도구가 된다 (FR-204)
      let caught: Error | undefined;
      try {
        service.applyMove(["e4", "e5"], "Nf6");
      } catch (error) {
        caught = error as Error;
      }

      expect(caught).toBeInstanceOf(IllegalMoveError);
      expect(caught?.message).not.toMatch(/knight|nf6|f6|square|piece|check/i);
    });

    it("실패해도 기존 기보를 변형하지 않는다", () => {
      const sans = ["e4", "e5"];

      expect(() => service.applyMove(sans, "Qxf7")).toThrow(IllegalMoveError);
      expect(sans).toEqual(["e4", "e5"]);
    });

    it("실패 뒤에도 같은 기보로 정상 수를 둘 수 있다", () => {
      const sans = ["e4", "e5"];

      expect(() => service.applyMove(sans, "Nf6")).toThrow(IllegalMoveError);
      expect(service.applyMove(sans, "Nf3").san).toBe("Nf3");
    });
  });

  describe("getOutcome (FR-401, FR-402)", () => {
    it("진행 중인 게임은 null을 반환한다", () => {
      expect(service.getOutcome(service.replay(["e4", "e5"]))).toBeNull();
    });

    it("시작 포지션도 null을 반환한다", () => {
      expect(service.getOutcome(service.replay([]))).toBeNull();
    });

    it("체크메이트를 판정하고 승자를 알려준다", () => {
      const outcome = service.getOutcome(service.replay([...FIXTURES.foolsMate]));

      expect(outcome).toEqual({ winner: "b", reason: "checkmate" });
    });

    it("스테일메이트를 무승부로 판정한다", () => {
      const outcome = service.getOutcome(service.replay([...FIXTURES.stalemate]));

      expect(outcome).toEqual({ winner: null, reason: "stalemate" });
    });

    it("3회 동형 반복을 무승부로 판정한다", () => {
      const outcome = service.getOutcome(service.replay([...FIXTURES.threefold]));

      expect(outcome).toEqual({ winner: null, reason: "threefold" });
    });

    it("50수 규칙을 무승부로 판정한다", () => {
      const chess = new Chess(FEN_BEFORE_FIFTY_MOVE);
      chess.move("Kd2");

      expect(service.getOutcome(chess)).toEqual({
        winner: null,
        reason: "fifty_move",
      });
    });

    it("기물 부족을 무승부로 판정한다", () => {
      const chess = new Chess(FEN_INSUFFICIENT_MATERIAL);

      expect(service.getOutcome(chess)).toEqual({
        winner: null,
        reason: "insufficient_material",
      });
    });

    it("체크는 종료 사유가 아니다", () => {
      // 체크 상태는 표시만 하고 게임은 계속된다 (FR-206)
      const chess = new Chess(FEN_BEFORE_CHECK);
      chess.move("Ra8+");

      expect(chess.inCheck()).toBe(true);
      expect(service.getOutcome(chess)).toBeNull();
    });
  });
});
