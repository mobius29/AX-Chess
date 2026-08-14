import { HttpException, HttpStatus } from "@nestjs/common";

export class NicknameTakenException extends HttpException {
  constructor() {
    super({ code: "NICKNAME_TAKEN", message: "이미 사용 중인 닉네임입니다." }, HttpStatus.CONFLICT);
  }
}
