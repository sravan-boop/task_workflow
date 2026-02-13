import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8, "Password must be at least 8 characters"),
        name: z.string().min(1, "Name is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this email already exists",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 12);

      const user = await ctx.prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
        },
      });

      // Create a default workspace for the user
      const workspace = await ctx.prisma.workspace.create({
        data: {
          name: `${input.name}'s Workspace`,
          members: {
            create: {
              userId: user.id,
              role: "OWNER",
            },
          },
        },
      });

      // Create a default team
      await ctx.prisma.team.create({
        data: {
          name: `${input.name}'s Team`,
          workspaceId: workspace.id,
          members: {
            create: {
              userId: user.id,
              role: "LEAD",
            },
          },
        },
      });

      return { success: true, userId: user.id };
    }),

  getSession: publicProcedure.query(async ({ ctx }) => {
    return ctx.session;
  }),

  // Request a password reset token
  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      // Always return success to prevent email enumeration
      if (!user) {
        return { success: true };
      }

      // Generate a secure token
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Delete any existing tokens for this email
      await ctx.prisma.verificationToken.deleteMany({
        where: { identifier: input.email },
      });

      // Store the reset token
      await ctx.prisma.verificationToken.create({
        data: {
          identifier: input.email,
          token,
          expires,
        },
      });

      // In production, send email via Resend/SendGrid
      // For now, log the reset link (development mode)
      console.log(
        `[Password Reset] Token for ${input.email}: ${token}`
      );
      console.log(
        `[Password Reset] Link: ${process.env.NEXTAUTH_URL}/reset-password?token=${token}&email=${encodeURIComponent(input.email)}`
      );

      return { success: true };
    }),

  // Reset password with token
  resetPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        token: z.string(),
        newPassword: z
          .string()
          .min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const verificationToken =
        await ctx.prisma.verificationToken.findFirst({
          where: {
            identifier: input.email,
            token: input.token,
            expires: { gt: new Date() },
          },
        });

      if (!verificationToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired reset token",
        });
      }

      const passwordHash = await bcrypt.hash(input.newPassword, 12);

      await ctx.prisma.user.update({
        where: { email: input.email },
        data: { passwordHash },
      });

      // Delete the used token
      await ctx.prisma.verificationToken.deleteMany({
        where: { identifier: input.email },
      });

      return { success: true };
    }),

  // Change password (authenticated)
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z
          .string()
          .min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.session.user.id },
      });

      if (!user.passwordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Account uses social login. Set a password from your profile first.",
        });
      }

      const isValid = await bcrypt.compare(
        input.currentPassword,
        user.passwordHash
      );

      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Current password is incorrect",
        });
      }

      const passwordHash = await bcrypt.hash(input.newPassword, 12);

      await ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { passwordHash },
      });

      return { success: true };
    }),

  // Verify email address
  verifyEmail: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        token: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const verificationToken =
        await ctx.prisma.verificationToken.findFirst({
          where: {
            identifier: `verify:${input.email}`,
            token: input.token,
            expires: { gt: new Date() },
          },
        });

      if (!verificationToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired verification token",
        });
      }

      await ctx.prisma.user.update({
        where: { email: input.email },
        data: { emailVerified: new Date() },
      });

      await ctx.prisma.verificationToken.deleteMany({
        where: { identifier: `verify:${input.email}` },
      });

      return { success: true };
    }),

  // Resend verification email
  resendVerification: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.session.user.id },
    });

    if (user.emailVerified) {
      return { success: true, alreadyVerified: true };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await ctx.prisma.verificationToken.deleteMany({
      where: { identifier: `verify:${user.email}` },
    });

    await ctx.prisma.verificationToken.create({
      data: {
        identifier: `verify:${user.email}`,
        token,
        expires,
      },
    });

    // In production, send email
    console.log(
      `[Email Verification] Token for ${user.email}: ${token}`
    );
    console.log(
      `[Email Verification] Link: ${process.env.NEXTAUTH_URL}/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`
    );

    return { success: true, alreadyVerified: false };
  }),

  // Check if user has completed onboarding
  getOnboardingStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.session.user.id },
      select: { isOnboarded: true },
    });
    return { isOnboarded: user.isOnboarded };
  }),

  // Mark onboarding as complete
  markOnboarded: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.user.update({
      where: { id: ctx.session.user.id },
      data: { isOnboarded: true },
    });
    return { success: true };
  }),

  // Do Not Disturb
  setDnd: protectedProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        until: z.string().datetime().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: {
          doNotDisturb: input.enabled,
          dndUntil: input.until ? new Date(input.until) : null,
        },
      });
      return { success: true };
    }),

  getDndStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.session.user.id },
      select: { doNotDisturb: true, dndUntil: true },
    });

    // Auto-expire DND if past the until time
    if (user.doNotDisturb && user.dndUntil && user.dndUntil < new Date()) {
      await ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { doNotDisturb: false, dndUntil: null },
      });
      return { doNotDisturb: false, dndUntil: null };
    }

    return user;
  }),

  updateLocale: protectedProcedure
    .input(z.object({ locale: z.string().min(2).max(10) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { locale: input.locale },
      });
      return { success: true };
    }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        locale: true,
        doNotDisturb: true,
        dndUntil: true,
        twoFactorEnabled: true,
      },
    });
  }),
});
