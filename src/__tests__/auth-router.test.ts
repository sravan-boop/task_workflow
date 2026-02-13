import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn(),
  },
}));

// Mock crypto
vi.mock("crypto", () => ({
  default: {
    randomBytes: vi.fn().mockReturnValue({
      toString: () => "mock-reset-token-abc123",
    }),
  },
}));

import bcrypt from "bcryptjs";
import { router, publicProcedure, protectedProcedure } from "@/server/trpc/trpc";
import { authRouter } from "@/server/trpc/routers/auth";

// Suppress console.log for token logging in tests
const originalConsoleLog = console.log;
beforeEach(() => {
  console.log = vi.fn();
  vi.clearAllMocks();
  return () => {
    console.log = originalConsoleLog;
  };
});

// Helper to create a mock Prisma client
function createMockPrisma() {
  return {
    user: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    workspace: {
      create: vi.fn(),
    },
    team: {
      create: vi.fn(),
    },
    verificationToken: {
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
}

describe("Auth Router", () => {
  describe("forgotPassword", () => {
    it("returns success even when the email does not exist (prevents email enumeration)", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const caller = authRouter.createCaller({
        session: null,
        prisma: mockPrisma as any,
      });

      const result = await caller.forgotPassword({ email: "nonexistent@example.com" });

      expect(result).toEqual({ success: true });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "nonexistent@example.com" },
      });
      // Should NOT create a token for non-existent email
      expect(mockPrisma.verificationToken.create).not.toHaveBeenCalled();
    });

    it("returns success and creates a token when the email exists", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
      });
      mockPrisma.verificationToken.deleteMany.mockResolvedValue({});
      mockPrisma.verificationToken.create.mockResolvedValue({});

      const caller = authRouter.createCaller({
        session: null,
        prisma: mockPrisma as any,
      });

      const result = await caller.forgotPassword({ email: "test@example.com" });

      expect(result).toEqual({ success: true });
      expect(mockPrisma.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: { identifier: "test@example.com" },
      });
      expect(mockPrisma.verificationToken.create).toHaveBeenCalledWith({
        data: {
          identifier: "test@example.com",
          token: expect.any(String),
          expires: expect.any(Date),
        },
      });
    });
  });

  describe("resetPassword", () => {
    it("throws BAD_REQUEST when token is invalid or expired", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.verificationToken.findFirst.mockResolvedValue(null);

      const caller = authRouter.createCaller({
        session: null,
        prisma: mockPrisma as any,
      });

      await expect(
        caller.resetPassword({
          email: "test@example.com",
          token: "invalid-token",
          newPassword: "newpassword123",
        })
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.resetPassword({
          email: "test@example.com",
          token: "invalid-token",
          newPassword: "newpassword123",
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Invalid or expired reset token",
      });
    });

    it("resets password successfully with valid token", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.verificationToken.findFirst.mockResolvedValue({
        identifier: "test@example.com",
        token: "valid-token",
        expires: new Date(Date.now() + 3600000),
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.verificationToken.deleteMany.mockResolvedValue({});

      const caller = authRouter.createCaller({
        session: null,
        prisma: mockPrisma as any,
      });

      const result = await caller.resetPassword({
        email: "test@example.com",
        token: "valid-token",
        newPassword: "newpassword123",
      });

      expect(result).toEqual({ success: true });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        data: { passwordHash: "hashed-password" },
      });
      // Token should be cleaned up after use
      expect(mockPrisma.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: { identifier: "test@example.com" },
      });
    });

    it("validates that new password is at least 8 characters", async () => {
      const mockPrisma = createMockPrisma();

      const caller = authRouter.createCaller({
        session: null,
        prisma: mockPrisma as any,
      });

      // Password too short should fail validation
      await expect(
        caller.resetPassword({
          email: "test@example.com",
          token: "valid-token",
          newPassword: "short",
        })
      ).rejects.toThrow();
    });
  });

  describe("changePassword", () => {
    it("throws UNAUTHORIZED when current password is incorrect", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        passwordHash: "existing-hash",
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const caller = authRouter.createCaller({
        session: {
          user: { id: "user-1", name: "Test", email: "test@example.com" },
          expires: new Date().toISOString(),
        } as any,
        prisma: mockPrisma as any,
      });

      await expect(
        caller.changePassword({
          currentPassword: "wrongpassword",
          newPassword: "newpassword123",
        })
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.changePassword({
          currentPassword: "wrongpassword",
          newPassword: "newpassword123",
        })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "Current password is incorrect",
      });
    });

    it("changes password successfully when current password is valid", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        passwordHash: "existing-hash",
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mockPrisma.user.update.mockResolvedValue({});

      const caller = authRouter.createCaller({
        session: {
          user: { id: "user-1", name: "Test", email: "test@example.com" },
          expires: new Date().toISOString(),
        } as any,
        prisma: mockPrisma as any,
      });

      const result = await caller.changePassword({
        currentPassword: "correctpassword",
        newPassword: "newpassword123",
      });

      expect(result).toEqual({ success: true });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { passwordHash: "hashed-password" },
      });
    });

    it("throws BAD_REQUEST when user has no password (social login)", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        passwordHash: null,
      });

      const caller = authRouter.createCaller({
        session: {
          user: { id: "user-1", name: "Test", email: "test@example.com" },
          expires: new Date().toISOString(),
        } as any,
        prisma: mockPrisma as any,
      });

      await expect(
        caller.changePassword({
          currentPassword: "anything",
          newPassword: "newpassword123",
        })
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.changePassword({
          currentPassword: "anything",
          newPassword: "newpassword123",
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Account uses social login. Set a password from your profile first.",
      });
    });

    it("validates that new password is at least 8 characters", async () => {
      const mockPrisma = createMockPrisma();

      const caller = authRouter.createCaller({
        session: {
          user: { id: "user-1", name: "Test", email: "test@example.com" },
          expires: new Date().toISOString(),
        } as any,
        prisma: mockPrisma as any,
      });

      // Password too short should fail validation (Zod)
      await expect(
        caller.changePassword({
          currentPassword: "correctpassword",
          newPassword: "short",
        })
      ).rejects.toThrow();
    });

    it("requires authentication (UNAUTHORIZED without session)", async () => {
      const mockPrisma = createMockPrisma();

      const caller = authRouter.createCaller({
        session: null,
        prisma: mockPrisma as any,
      });

      await expect(
        caller.changePassword({
          currentPassword: "anything",
          newPassword: "newpassword123",
        })
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.changePassword({
          currentPassword: "anything",
          newPassword: "newpassword123",
        })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });

  describe("register", () => {
    it("validates password must be at least 8 characters", async () => {
      const mockPrisma = createMockPrisma();

      const caller = authRouter.createCaller({
        session: null,
        prisma: mockPrisma as any,
      });

      await expect(
        caller.register({
          email: "test@example.com",
          password: "short",
          name: "Test User",
        })
      ).rejects.toThrow();
    });

    it("throws CONFLICT when email already exists", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "existing-user",
        email: "test@example.com",
      });

      const caller = authRouter.createCaller({
        session: null,
        prisma: mockPrisma as any,
      });

      await expect(
        caller.register({
          email: "test@example.com",
          password: "password123",
          name: "Test User",
        })
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.register({
          email: "test@example.com",
          password: "password123",
          name: "Test User",
        })
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: "User with this email already exists",
      });
    });
  });
});
