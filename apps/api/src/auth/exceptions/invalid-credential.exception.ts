import { HttpException, HttpStatus } from "@nestjs/common";

export class InvalidCredentialException extends HttpException {
  constructor() {
    super(
      { code: "INVALID_CREDENTIALS", message: "이메일 또는 비밀번호가 일치하지 않습니다." },
      HttpStatus.UNAUTHORIZED,
    );
  }
}
