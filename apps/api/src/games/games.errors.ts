import type { ApiErrorCode } from "@ax-chess/shared";
import { HttpException, HttpStatus } from "@nestjs/common";

export class GameApiException extends HttpException {
  constructor(code: ApiErrorCode, message: string, status: HttpStatus, extra?: Record<string, unknown>) {
    super({ code, message, ...extra }, status);
  }
}

export class GameNotFoundException extends GameApiException {
  constructor() {
    super("GAME_NOT_FOUND", "존재하지 않는 게임입니다.", HttpStatus.NOT_FOUND);
  }
}

export class GameForbiddenException extends GameApiException {
  constructor() {
    super("FORBIDDEN", "이 게임에 접근할 권한이 없습니다.", HttpStatus.FORBIDDEN);
  }
}

export class ActiveGameExistsException extends GameApiException {
  constructor() {
    super("ACTIVE_GAME_EXISTS", "이미 진행 중인 게임이 있습니다.", HttpStatus.CONFLICT);
  }
}

export class GameAlreadyFinishedException extends GameApiException {
  constructor() {
    super("GAME_ALREADY_FINISHED", "이미 종료된 게임입니다.", HttpStatus.CONFLICT);
  }
}

export class NotYourTurnException extends GameApiException {
  constructor() {
    super("NOT_YOUR_TURN", "지금은 상대의 차례입니다.", HttpStatus.CONFLICT);
  }
}

export class NotAiTurnException extends GameApiException {
  constructor() {
    super("NOT_AI_TURN", "AI의 차례가 아닙니다.", HttpStatus.CONFLICT);
  }
}

export class IllegalMoveException extends GameApiException {
  constructor(illegalCount: number) {
    super("ILLEGAL_MOVE", "둘 수 없는 수입니다.", HttpStatus.UNPROCESSABLE_ENTITY, { illegalCount });
  }
}

export class EngineUnavailableException extends GameApiException {
  constructor() {
    super("ENGINE_UNAVAILABLE", "엔진이 응답하지 않습니다.", HttpStatus.SERVICE_UNAVAILABLE);
  }
}
