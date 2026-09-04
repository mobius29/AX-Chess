import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, type JwtSignOptions } from "@nestjs/jwt";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { GamesModule } from "./games/games.module";
import { PrismaModule } from "./prisma.module";

const DAY_MS = 24 * 60 * 60 * 1000;

const accessTokenTtlFrom = (value: string): NonNullable<JwtSignOptions["expiresIn"]> => {
  if (!/^[1-9]\d*(ms|s|m|h|d|w|y)$/.test(value)) {
    throw new Error("ACCESS_TOKEN_TTL must be a positive duration such as 15m.");
  }
  return value as NonNullable<JwtSignOptions["expiresIn"]>;
};

export const refreshTokenTtlMsFrom = (value: string) => {
  const days = Number(value);
  if (!Number.isSafeInteger(days) || days <= 0 || days > Math.floor(Number.MAX_SAFE_INTEGER / DAY_MS)) {
    throw new Error("REFRESH_TOKEN_TTL_DAYS must be a positive integer.");
  }
  return days * DAY_MS;
};

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: [".env", "../../.env"], isGlobal: true }),
    JwtModule.registerAsync({
      global: true,
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_SECRET"),
        signOptions: { expiresIn: accessTokenTtlFrom(configService.getOrThrow<string>("ACCESS_TOKEN_TTL")) },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    AuthModule,
    GamesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: "REFRESH_TOKEN_TTL_MS",
      useFactory: (configService: ConfigService) =>
        refreshTokenTtlMsFrom(configService.getOrThrow<string>("REFRESH_TOKEN_TTL_DAYS")),
      inject: [ConfigService],
    },
  ],
})
export class AppModule {}
