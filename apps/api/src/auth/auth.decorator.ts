import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface JwtPayload {
  sub: string;
  email: string;
  oauthAuthenticatedAt?: number;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtPayload => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
