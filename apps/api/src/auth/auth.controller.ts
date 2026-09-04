import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import { CurrentUser } from "./auth.decorator";
import type { JwtPayload } from "./auth.decorator";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { SignInRequestDTO } from "./dtos/login.dto";
import { SignUpRequestDTO } from "./dtos/sign-up.dto";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @Get("me")
  async getMe(@CurrentUser() user: JwtPayload) {
    return this.authService.getCurrentUser(user.sub);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post("signup")
  async signup(@Body() signUpReqDTO: SignUpRequestDTO) {
    const { email, nickname, password } = signUpReqDTO;
    const createdUser = await this.authService.createUser(email, nickname, password);
    return createdUser;
  }

  @HttpCode(HttpStatus.OK)
  @Post("login")
  async signin(@Body() signInReqDTO: SignInRequestDTO) {
    const { email, password } = signInReqDTO;
    return this.authService.signIn(email, password);
  }

  @HttpCode(HttpStatus.OK)
  @Post("refresh")
  async refresh(@Headers("x-refresh-token") refreshToken?: string) {
    if (!refreshToken?.trim()) {
      throw new UnauthorizedException({ code: "UNAUTHORIZED", message: "인증이 필요합니다." });
    }
    return this.authService.refresh(refreshToken);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post("logout")
  async logout(@Headers("x-refresh-token") refreshToken?: string) {
    await this.authService.signOut(refreshToken);
  }
}
