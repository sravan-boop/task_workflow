import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Resend } from "resend";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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

      const resetLink = `${process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${token}&email=${encodeURIComponent(input.email)}`;

      if (resend) {
        await resend.emails.send({
          from: "TaskFlow <onboarding@resend.dev>",
          to: input.email,
          subject: "Reset your TaskFlow password",
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #1e1f21;">Reset your password</h2>
              <p style="color: #6d6e6f;">Click the link below to reset your password. This link expires in 1 hour.</p>
              <a href="${resetLink}" style="display: inline-block; background: #4573D2; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">Reset Password</a>
              <p style="color: #6d6e6f; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        });
      } else {
        console.log(`[Password Reset] Link: ${resetLink}`);
      }

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

    const verifyLink = `${process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"}/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`;

    if (resend) {
      await resend.emails.send({
        from: "TaskFlow <onboarding@resend.dev>",
        to: user.email,
        subject: "Verify your TaskFlow email",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #1e1f21;">Verify your email</h2>
            <p style="color: #6d6e6f;">Click the link below to verify your email address.</p>
            <a href="${verifyLink}" style="display: inline-block; background: #4573D2; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">Verify Email</a>
          </div>
        `,
      });
    } else {
      console.log(`[Email Verification] Link: ${verifyLink}`);
    }

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
        title: true,
        department: true,
        bio: true,
        locale: true,
        doNotDisturb: true,
        dndUntil: true,
        twoFactorEnabled: true,
      },
    });
  }),

  getPrivateNotepad: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.session.user.id },
      select: { privateNotepad: true },
    });
    return { notepad: user.privateNotepad ?? "" };
  }),

  updatePrivateNotepad: protectedProcedure
    .input(z.object({ notepad: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { privateNotepad: input.notepad },
      });
      return { success: true };
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        title: z.string().max(100).optional(),
        department: z.string().max(100).optional(),
        bio: z.string().max(500).optional(),
        avatarUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.title !== undefined && { title: input.title }),
          ...(input.department !== undefined && { department: input.department }),
          ...(input.bio !== undefined && { bio: input.bio }),
          ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
        },
      });
    }),
});
