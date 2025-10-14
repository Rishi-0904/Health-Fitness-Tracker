import { Router } from "express";
import { z } from "zod";

import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const syncRequestSchema = z.object({
  provider: z.string().min(2),
  payload: z.record(z.any()),
  status: z.enum(["processed", "pending", "failed"]).default("processed"),
  errorMessage: z.string().optional()
});

const wearableQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export const wearableRouter = Router();

wearableRouter.use(requireAuth);

wearableRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { limit } = wearableQuerySchema.parse(req.query);
    const userId = req.user.id;

    const logs = await prisma.wearableSync.findMany({
      where: { userId },
      orderBy: { syncedAt: "desc" },
      take: limit
    });

    // Parse JSON payload strings back to objects
    const parsedLogs = logs.map(log => ({
      ...log,
      payload: JSON.parse(log.payload)
    }));

    res.json({ syncs: parsedLogs });
  })
);

wearableRouter.post(
  "/sync",
  asyncHandler(async (req, res) => {
    const payload = syncRequestSchema.parse(req.body);
    const userId = req.user.id;

    const record = await prisma.wearableSync.create({
      data: {
        userId,
        provider: payload.provider,
        payload: JSON.stringify(payload.payload), // Convert to string for SQLite
        status: payload.status,
        errorMessage: payload.errorMessage ?? null
      }
    });

    res.status(201).json({ sync: record });
  })
);

wearableRouter.post(
  "/simulate",
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Example simulated payload merging metrics update
    const fakePayload = {
      calories: Math.round(1800 + Math.random() * 400),
      steps: Math.round(6000 + Math.random() * 4000),
      sleepHours: Number((6 + Math.random() * 2).toFixed(1)),
      workoutsMinutes: Math.round(20 + Math.random() * 40)
    };

    const sync = await prisma.wearableSync.create({
      data: {
        userId: req.user.id,
        provider: "simulator",
        payload: JSON.stringify(fakePayload), // Convert to string for SQLite
        status: "processed"
      }
    });

    // Optionally update today's metric with simulated values
    const today = new Date();
    const normalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const metric = await prisma.dailyMetric.upsert({
      where: {
        userId_date: {
          userId,
          date: normalized
        }
      },
      update: fakePayload,
      create: {
        userId,
        date: normalized,
        ...fakePayload
      }
    });

    res.status(201).json({ sync, metric });
  })
);
