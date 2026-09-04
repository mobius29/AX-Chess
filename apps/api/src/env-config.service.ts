import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { JwtSignOptions } from "@nestjs/jwt";

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class EnvConfigService {
  readonly accessTokenTtl: NonNullable<JwtSignOptions["expiresIn"]>;
  readonly jwtSecret: string;
  readonly refreshTokenTtlMs: number;

  constructor(config: ConfigService) {
    this.accessTokenTtl = this.accessTokenTtlFrom(config.getOrThrow<string>("auth.accessTokenTtl"));
    this.jwtSecret = config.getOrThrow<string>("auth.jwtSecret");
    this.refreshTokenTtlMs = this.refreshTokenTtlMsFrom(config.getOrThrow<string>("auth.refreshTokenTtlDays"));
  }

  private accessTokenTtlFrom(value: string): NonNullable<JwtSignOptions["expiresIn"]> {
    if (!/^[1-9]\d*(ms|s|m|h|d|w|y)$/.test(value)) {
      throw new Error("ACCESS_TOKEN_TTL must be a positive duration such as 15m.");
    }
    return value as NonNullable<JwtSignOptions["expiresIn"]>;
  }

  private refreshTokenTtlMsFrom(value: string) {
    const days = Number(value);
    if (!Number.isSafeInteger(days) || days <= 0 || days > Math.floor(Number.MAX_SAFE_INTEGER / DAY_MS)) {
      throw new Error("REFRESH_TOKEN_TTL_DAYS must be a positive integer.");
    }
    return days * DAY_MS;
  }
}
