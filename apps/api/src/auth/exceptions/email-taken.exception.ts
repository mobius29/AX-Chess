import { HttpException, HttpStatus } from "@nestjs/common";

export class EmailTakenException extends HttpException {
  constructor() {
    super({ code: "EMAIL_TAKEN", message: "이미 사용 중인 이메일입니다." }, HttpStatus.CONFLICT);
  }
}
