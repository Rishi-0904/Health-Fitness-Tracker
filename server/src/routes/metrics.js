import dayjs from "dayjs";
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const metricsQuerySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(90).default(30)
});

const upsertMetricSchema = z.object({
  date: z.string(),
  calories: z.coerce.number().int().min(0).optional(),
  steps: z.coerce.number().int().min(0).optional(),
  sleepHours: z.coerce.number().min(0).optional(),
  workoutsMinutes: z.coerce.number().int().min(0).optional(),
  waterIntakeOz: z.coerce.number().min(0).optional(),
  notes: z.string().max(500).optional()
});

function parseDate(value, fallback) {
  if (!value) return fallback;
  const d = dayjs(value);
  return d.isValid() ? d : fallback;
}

export const dailyMetricsRouter = Router();

dailyMetricsRouter.use(requireAuth);

dailyMetricsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { start, end, limit } = metricsQuerySchema.parse(req.query);
    const userId = req.user.id;

    const now = dayjs().endOf("day");
    const startDate = parseDate(start, now.subtract(limit - 1, "day")).startOf("day");
    const endDate = parseDate(end, now).endOf("day");

    const metrics = await prisma.dailyMetric.findMany({
      where: {
        userId,
        date: {
          gte: startDate.toDate(),
          lte: endDate.toDate()
        }
      },
      orderBy: { date: "desc" },
      take: limit
    });

    res.json({ metrics });
  })
);

dailyMetricsRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const [latest] = await prisma.dailyMetric.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 1
    });

    const totals = await prisma.dailyMetric.aggregate({
      where: { userId },
      _avg: {
        calories: true,
        steps: true,
        sleepHours: true,
        workoutsMinutes: true,
        waterIntakeOz: true
      }
    });

    res.json({ latest, averages: totals._avg });
  })
);

dailyMetricsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = upsertMetricSchema.parse(req.body);
    const userId = req.user.id;

    const date = dayjs(payload.date).startOf("day");
    if (!date.isValid()) {
      return res.status(400).json({ message: "Invalid date" });
    }

    const upserted = await prisma.dailyMetric.upsert({
      where: {
        userId_date: {
          userId,
          date: date.toDate()
        }
      },
      update: {
        calories: payload.calories ?? 0,
        steps: payload.steps ?? 0,
        sleepHours: payload.sleepHours ?? 0,
        workoutsMinutes: payload.workoutsMinutes ?? 0,
        waterIntakeOz: payload.waterIntakeOz ?? 0,
        notes: payload.notes ?? null
      },
      create: {
        userId,
        date: date.toDate(),
        calories: payload.calories ?? 0,
        steps: payload.steps ?? 0,
        sleepHours: payload.sleepHours ?? 0,
        workoutsMinutes: payload.workoutsMinutes ?? 0,
        waterIntakeOz: payload.waterIntakeOz ?? 0,
        notes: payload.notes ?? null
      }
    });

    res.status(201).json({ metric: upserted });
  })
);
