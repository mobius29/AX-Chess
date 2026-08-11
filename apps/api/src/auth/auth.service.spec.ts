import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma.service";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    const prisma = {
      user: { findUnique: jest.fn(), create: jest.fn() },
      game: { groupBy: jest.fn() },
    };

    const jwt = { sign: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [AuthService, { provide: PrismaService, useValue: prisma }, { provide: JwtService, useValue: jwt }],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
