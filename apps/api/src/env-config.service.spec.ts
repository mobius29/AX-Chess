import { ConfigService } from "@nestjs/config";

import { EnvConfigService } from "./env-config.service";

describe("EnvConfigService", () => {
  const config = (values: Record<string, string>) =>
    ({ getOrThrow: (key: string) => values[key] }) as unknown as ConfigService;

  it("parses token configuration", () => {
    const env = new EnvConfigService(
      config({ "auth.accessTokenTtl": "15m", "auth.jwtSecret": "secret", "auth.refreshTokenTtlDays": "7" }),
    );

    expect(env.accessTokenTtl).toBe("15m");
    expect(env.refreshTokenTtlMs).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("rejects invalid refresh-token TTL", () => {
    expect(
      () => new EnvConfigService(config({ "auth.accessTokenTtl": "15m", "auth.jwtSecret": "secret", "auth.refreshTokenTtlDays": "0" })),
    ).toThrow(
      "REFRESH_TOKEN_TTL_DAYS must be a positive integer.",
    );
  });
});
