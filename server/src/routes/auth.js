import crypto from "crypto";
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { signToken } from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(2).max(60),
  timezone: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const updateProfileSchema = z
  .object({
    displayName: z.string().min(2).max(60).optional(),
    timezone: z.string().min(1).max(100).optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field must be provided"
  });

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .refine((value, ctx) => value !== ctx.parent?.currentPassword, {
      message: "New password must differ from current password"
    })
});

const requestResetSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8, "Password must be at least 8 characters")
});

function toAuthUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName
  };
}

export const authRouter = Router();

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const payload = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: payload.email } });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await hashPassword(payload.password);

    const user = await prisma.user.create({
      data: {
        email: payload.email,
        passwordHash,
        displayName: payload.displayName,
        timezone: payload.timezone ?? "UTC"
      }
    });

    const authUser = toAuthUser(user);
    const token = signToken(authUser);

    res.status(201).json({ token, user: authUser });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const payload = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: payload.email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await verifyPassword(payload.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const authUser = toAuthUser(user);
    const token = signToken(authUser);

    res.json({ token, user: authUser });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

authRouter.patch(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = updateProfileSchema.parse(req.body);

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: payload
    });

    res.json({ user: toAuthUser(updated) });
  })
);

authRouter.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentValid = await verifyPassword(payload.currentPassword, user.passwordHash);
    if (!currentValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const passwordHash = await hashPassword(payload.newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    res.status(204).end();
  })
);

authRouter.post(
  "/request-password-reset",
  asyncHandler(async (req, res) => {
    const payload = requestResetSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: payload.email } });

    if (user) {
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true }
      });

      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt
        }
      });

      res.json({ message: "If the account exists, a reset link has been generated.", resetToken: rawToken });
    } else {
      res.json({ message: "If the account exists, a reset link has been generated." });
    }
  })
);

authRouter.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const payload = resetPasswordSchema.parse(req.body);

    const tokenHash = crypto.createHash("sha256").update(payload.token).digest("hex");

    const record = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        used: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!record) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const passwordHash = await hashPassword(payload.newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash }
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { used: true }
      })
    ]);

    res.status(204).end();
  })
);
