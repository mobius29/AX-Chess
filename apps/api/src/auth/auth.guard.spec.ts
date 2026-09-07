import type { ExecutionContext } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { PrismaService } from "../prisma.service";
import { AuthGuard } from "./auth.guard";

const context = (token?: string) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: token && `Bearer ${token}` } }) }),
  }) as ExecutionContext;

describe("AuthGuard account deletion", () => {
  const jwt = new JwtService({ secret: "test-secret" });
  const findUnique = jest.fn();
  const guard = new AuthGuard(jwt, { user: { findUnique } } as unknown as PrismaService);

  beforeEach(() => findUnique.mockReset());

  it("rejects a still-valid JWT once the account is deleted", async () => {
    const token = jwt.sign({ sub: "deleted-user" });
    findUnique.mockResolvedValue({ id: "deleted-user" });
    await expect(guard.canActivate(context(token))).resolves.toBe(true);
    findUnique.mockResolvedValue(null);
    await expect(guard.canActivate(context(token))).rejects.toMatchObject({ status: 401 });
  });

  it.each([undefined, "invalid", jwt.sign({}), jwt.sign({ sub: 42 })])(
    "rejects invalid identity: %s",
    async (token) => {
      await expect(guard.canActivate(context(token))).rejects.toMatchObject({ status: 401 });
      expect(findUnique).not.toHaveBeenCalled();
    },
  );

  it("propagates database failures", async () => {
    findUnique.mockRejectedValue(new Error("database unavailable"));
    await expect(guard.canActivate(context(jwt.sign({ sub: "user" })))).rejects.toThrow("database unavailable");
  });
});
