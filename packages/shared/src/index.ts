/**
 * FE/BE가 공유하는 API 계약. 타입만 담는다.
 *
 * 런타임 값(상수, 함수, enum)을 여기 넣지 말 것. 타입만 있으면 컴파일 시
 * import가 전부 지워져서 빌드 스텝 없이 소스를 직접 참조할 수 있다.
 * 런타임 값이 하나라도 들어오면 이 패키지에 tsc 빌드가 필요해진다.
 */

export type Color = "white" | "black";
export type ColorChoice = Color | "random";
export type Difficulty = "easy" | "normal" | "hard";
export type GameStatus = "active" | "finished";
export type GameResult = "win" | "loss" | "draw";

export type EndedReason = "checkmate" | "stalemate" | "resign" | "fifty_move" | "threefold" | "insufficient_material";

export type MoveClassification = "good" | "inaccuracy" | "mistake" | "blunder";

/**
 * 진행 중인 게임의 상태.
 *
 * 맹기 무결성: fen, board, pieces, legalMoves, evaluation 필드를 절대 추가하지 않는다.
 * 보드 상태가 클라이언트로 새면 제품이 성립하지 않는다.
 */
export interface GameStateDto {
  id: string;
  color: Color;
  difficulty: Difficulty;
  status: GameStatus;
  /** 게임이 끝났으면 null */
  turn: Color | null;
  /** ply 순서대로 정규화된 SAN */
  moves: string[];
  moveCount: number;
  illegalCount: number;
  inCheck: boolean;
  result: GameResult | null;
  endedReason: EndedReason | null;
  createdAt: string;
  endedAt: string | null;
}

/** POST /games */
export interface CreateGameRequest {
  color: ColorChoice;
  difficulty: Difficulty;
}

/** POST /games/:id/moves */
export interface SubmitMoveRequest {
  /** SAN 또는 UCI. 서버가 파싱·검증한다 */
  move: string;
}

export interface SubmitMoveResponse extends GameStateDto {
  /** 정규화되어 저장된 사용자의 수 */
  accepted: string;
  /** 게임이 사용자의 수로 끝났으면 null */
  aiMove: string | null;
}

/** 기록 목록의 한 항목 */
export interface GameSummaryDto {
  id: string;
  result: GameResult;
  endedReason: EndedReason;
  difficulty: Difficulty;
  color: Color;
  moveCount: number;
  illegalCount: number;
  /** 정상 반영된 수 / (정상 반영된 수 + 실착수) */
  accuracy: number;
  endedAt: string;
}

export interface GameListResponse {
  items: GameSummaryDto[];
  nextCursor: string | null;
}

/**
 * 복기 응답의 한 수.
 *
 * 종료된 게임에만 발급되므로 fen을 포함한다.
 * FEN을 반환하는 유일한 경로다.
 */
export interface ReviewPlyDto {
  ply: number;
  san: string;
  side: Color;
  fen: string; // blindfold-ok: status=finished 게이트 뒤에서만 발급된다
  /** centipawn, 백 기준 양수. 메이트는 ±10000으로 클립 */
  evalCp: number; // blindfold-ok: 복기 전용
  classification: MoveClassification;
}

/** GET /games/:id/review */
export interface ReviewResponse {
  gameId: string;
  color: Color;
  result: GameResult;
  endedReason: EndedReason;
  initialFen: string;
  plies: ReviewPlyDto[];
  analyzedAt: string;
}

export interface UserDto {
  id: string;
  email: string;
  nickname: string;
  stats: {
    total: number;
    wins: number;
    losses: number;
    draws: number;
  };
}

export type ApiErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHORIZED"
  | "INVALID_CREDENTIALS"
  | "FORBIDDEN"
  | "GAME_NOT_FINISHED"
  | "GAME_NOT_FOUND"
  | "EMAIL_TAKEN"
  | "NICKNAME_TAKEN"
  | "ACTIVE_GAME_EXISTS"
  | "GAME_ALREADY_FINISHED"
  | "NOT_YOUR_TURN"
  | "NOT_AI_TURN"
  | "ILLEGAL_MOVE"
  | "ENGINE_UNAVAILABLE";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignUpRequest extends LoginRequest {
  nickname: string;
}
