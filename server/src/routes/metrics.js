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

const updateMetricSchema = upsertMetricSchema.partial().refine(
  (payload) => Object.keys(payload).length > 0,
  { message: "At least one field must be provided" }
);

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

dailyMetricsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = updateMetricSchema.parse(req.body);
    const userId = req.user.id;

    const existing = await prisma.dailyMetric.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ message: "Metric not found" });
    }

    const data = {};

    if (payload.date !== undefined) {
      const date = dayjs(payload.date).startOf("day");
      if (!date.isValid()) {
        return res.status(400).json({ message: "Invalid date" });
      }
      data.date = date.toDate();
    }

    if (payload.calories !== undefined) data.calories = payload.calories;
    if (payload.steps !== undefined) data.steps = payload.steps;
    if (payload.sleepHours !== undefined) data.sleepHours = payload.sleepHours;
    if (payload.workoutsMinutes !== undefined) data.workoutsMinutes = payload.workoutsMinutes;
    if (payload.waterIntakeOz !== undefined) data.waterIntakeOz = payload.waterIntakeOz;
    if (payload.notes !== undefined) data.notes = payload.notes;

    const metric = await prisma.dailyMetric.update({
      where: { id },
      data
    });

    res.json({ metric });
  })
);

dailyMetricsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await prisma.dailyMetric.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ message: "Metric not found" });
    }

    await prisma.dailyMetric.delete({ where: { id } });

    res.status(204).end();
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
