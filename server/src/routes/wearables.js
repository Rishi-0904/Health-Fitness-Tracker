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

const updateSyncSchema = z.object({
  status: z.enum(["processed", "pending", "failed"]).optional(),
  errorMessage: z.string().nullable().optional(),
  payload: z.record(z.any()).optional()
}).refine((payload) => Object.keys(payload).length > 0, {
  message: "At least one field must be provided"
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

wearableRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = updateSyncSchema.parse(req.body);
    const userId = req.user.id;

    const existing = await prisma.wearableSync.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ message: "Sync log not found" });
    }

    const data = {};

    if (payload.status !== undefined) {
      data.status = payload.status;
      if (payload.status === "processed") {
        data.errorMessage = null;
      }
    }

    if (payload.errorMessage !== undefined) {
      data.errorMessage = payload.errorMessage ?? null;
    }

    if (payload.payload !== undefined) {
      data.payload = JSON.stringify(payload.payload);
    }

    const updated = await prisma.wearableSync.update({
      where: { id },
      data
    });

    res.json({
      sync: {
        ...updated,
        payload: JSON.parse(updated.payload)
      }
    });
  })
);

wearableRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await prisma.wearableSync.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ message: "Sync log not found" });
    }

    await prisma.wearableSync.delete({ where: { id } });

    res.status(204).end();
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
