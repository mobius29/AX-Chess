import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, type JwtSignOptions } from "@nestjs/jwt";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { GamesModule } from "./games/games.module";
import { PrismaModule } from "./prisma.module";

const accessTokenTtlFrom = (value: string): NonNullable<JwtSignOptions["expiresIn"]> => {
  if (!/^[1-9]\d*(ms|s|m|h|d|w|y)$/.test(value)) {
    throw new Error("ACCESS_TOKEN_TTL must be a positive duration such as 15m.");
  }
  return value as NonNullable<JwtSignOptions["expiresIn"]>;
};

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  providers: [AppService],
})
export class AppModule {}
