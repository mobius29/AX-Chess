import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController", () => {
  let controller: AuthController;
  let authService: { refresh: jest.Mock };

  beforeEach(async () => {
    authService = { refresh: jest.fn() };
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            ...authService,
            getCurrentUser: jest.fn(),
            createUser: jest.fn(),
            refresh: jest.fn(),
            signIn: jest.fn(),
            signOut: jest.fn(),
          },
        },
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("rejects a missing refresh token before calling the service", async () => {
    await expect(controller.refresh(" ")).rejects.toMatchObject({ status: 401 });
    expect(authService.refresh).not.toHaveBeenCalled();
  });
});
