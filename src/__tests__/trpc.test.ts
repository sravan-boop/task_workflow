import { describe, it, expect } from "vitest";
import { router, publicProcedure, protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";

describe("tRPC setup", () => {
  describe("router", () => {
    it("creates a router with procedures", () => {
      const appRouter = router({
        hello: publicProcedure.query(() => {
          return "world";
        }),
      });
      expect(appRouter).toBeDefined();
      expect(appRouter._def).toBeDefined();
    });

    it("creates an empty router", () => {
      const appRouter = router({});
      expect(appRouter).toBeDefined();
    });
  });

  describe("publicProcedure", () => {
    it("is defined and can be used to create a query", () => {
      const appRouter = router({
        greeting: publicProcedure.query(() => {
          return "hello";
        }),
      });
      expect(appRouter).toBeDefined();
      expect(appRouter._def.procedures.greeting).toBeDefined();
    });

    it("executes without requiring a session", async () => {
      const appRouter = router({
        greeting: publicProcedure.query(() => {
          return "hello from public";
        }),
      });

      const caller = appRouter.createCaller({
        session: null,
        prisma: {} as any,
      });

      const result = await caller.greeting();
      expect(result).toBe("hello from public");
    });
  });

  describe("protectedProcedure", () => {
    it("throws UNAUTHORIZED when session is null", async () => {
      const appRouter = router({
        secret: protectedProcedure.query(() => {
          return "secret data";
        }),
      });

      const caller = appRouter.createCaller({
        session: null,
        prisma: {} as any,
      });

      await expect(caller.secret()).rejects.toThrow(TRPCError);
      await expect(caller.secret()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("throws UNAUTHORIZED when session has no user", async () => {
      const appRouter = router({
        secret: protectedProcedure.query(() => {
          return "secret data";
        }),
      });

      const caller = appRouter.createCaller({
        session: { user: undefined } as any,
        prisma: {} as any,
      });

      await expect(caller.secret()).rejects.toThrow(TRPCError);
      await expect(caller.secret()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("throws UNAUTHORIZED when user has no id", async () => {
      const appRouter = router({
        secret: protectedProcedure.query(() => {
          return "secret data";
        }),
      });

      const caller = appRouter.createCaller({
        session: { user: { id: undefined } } as any,
        prisma: {} as any,
      });

      await expect(caller.secret()).rejects.toThrow(TRPCError);
      await expect(caller.secret()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("passes with a valid session containing user id", async () => {
      const appRouter = router({
        secret: protectedProcedure.query(() => {
          return "secret data";
        }),
      });

      const caller = appRouter.createCaller({
        session: {
          user: {
            id: "user-123",
            name: "Test User",
            email: "test@example.com",
          },
          expires: new Date().toISOString(),
        } as any,
        prisma: {} as any,
      });

      const result = await caller.secret();
      expect(result).toBe("secret data");
    });

    it("passes the session through context to the procedure", async () => {
      const appRouter = router({
        getUser: protectedProcedure.query(({ ctx }) => {
          return ctx.session.user.id;
        }),
      });

      const caller = appRouter.createCaller({
        session: {
          user: {
            id: "user-456",
            name: "Another User",
            email: "another@example.com",
          },
          expires: new Date().toISOString(),
        } as any,
        prisma: {} as any,
      });

      const result = await caller.getUser();
      expect(result).toBe("user-456");
    });
  });
});
