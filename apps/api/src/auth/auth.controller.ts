import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";

import { CurrentUser } from "./auth.decorator";
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
  // TODO: Request type should be inferred
  async getMe(@CurrentUser() user: { sub: string }) {
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
    const { accessToken, user } = await this.authService.signIn(email, password);

    return { accessToken, user };
  }
}
