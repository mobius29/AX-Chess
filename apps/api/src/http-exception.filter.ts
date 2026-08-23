import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Response } from "express";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    if (status === HttpStatus.INTERNAL_SERVER_ERROR && exception.cause) {
      this.logger.error(exception.cause);
    }

    const body = exception.getResponse();
    if (typeof body === "object" && "code" in body) {
      return response.status(status).json(body);
    }

    response.status(status).json({ code: "VALIDATION_FAILED", message: "입력값이 올바르지 않습니다" });
  }
}
