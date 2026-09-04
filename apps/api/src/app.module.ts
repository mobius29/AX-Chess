import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import configuration from "./config/configuration";
import { EnvConfigModule } from "./env-config.module";
import { EnvConfigService } from "./env-config.service";
import { GamesModule } from "./games/games.module";
import { PrismaModule } from "./prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: [".env", "../../.env"], isGlobal: true, load: [configuration] }),
    EnvConfigModule,
    JwtModule.registerAsync({
      global: true,
      useFactory: (env: EnvConfigService) => ({
        secret: env.jwtSecret,
        signOptions: { expiresIn: env.accessTokenTtl },
      }),
      inject: [EnvConfigService],
    }),
    PrismaModule,
    AuthModule,
    GamesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
