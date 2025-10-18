import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function getRecoveryRecommendation(status) {
  if (status === "optimal") {
    return "You're well recovered. Consider scheduling a quality training session today.";
  }

  if (status === "monitor") {
    return "Recovery is decent but not perfect. Keep hydration up and favor moderate intensity today.";
  }

  return "Recovery is low. Prioritize rest, mobility, and light activity before your next hard workout.";
}

dayjs.extend(duration);

const sleepQuerySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(180).default(30)
});

const sleepSessionSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  quality: z.enum(["excellent", "good", "fair", "poor", "unknown"]).default("unknown"),
  interruptions: z.coerce.number().int().min(0).default(0),
  notes: z.string().max(500).optional()
});

const updateSleepSchema = sleepSessionSchema.partial().refine(
  (payload) => Object.keys(payload).length > 0,
  { message: "At least one field must be provided" }
);

export const sleepRouter = Router();

sleepRouter.use(requireAuth);

sleepRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { start, end, limit } = sleepQuerySchema.parse(req.query);
    const userId = req.user.id;

    const endDate = end ? dayjs(end) : dayjs();
    const startDate = start ? dayjs(start) : endDate.subtract(limit - 1, "day");

    const sessions = await prisma.sleepSession.findMany({
      where: {
        userId,
        startTime: {
          gte: startDate.startOf("day").toDate(),
          lte: endDate.endOf("day").toDate()
        }
      },
      orderBy: { startTime: "desc" },
      take: limit
    });

    res.json({ sessions });
  })
);

sleepRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const sevenDaysAgo = dayjs().subtract(7, "day").startOf("day").toDate();

    const sessions = await prisma.sleepSession.findMany({
      where: {
        userId,
        startTime: { gte: sevenDaysAgo }
      },
      orderBy: { startTime: "desc" }
    });

    const totalDuration = sessions.reduce((acc, session) => {
      return (
        acc +
        dayjs(session.endTime).diff(dayjs(session.startTime), "minute")
      );
    }, 0);

    const averageMinutes = sessions.length ? totalDuration / sessions.length : 0;

    res.json({
      sessionsCount: sessions.length,
      averageMinutes,
      averageHours: Number((averageMinutes / 60).toFixed(2)),
      interruptions: sessions.reduce((acc, session) => acc + session.interruptions, 0)
    });
  })
);

sleepRouter.get(
  "/recovery",
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const latestSession = await prisma.sleepSession.findFirst({
      where: { userId },
      orderBy: { startTime: "desc" }
    });

    if (!latestSession) {
      return res.json({
        score: null,
        status: "no-data",
        message: "Log a sleep session to unlock recovery insights."
      });
    }

    const sessionStart = dayjs(latestSession.startTime);
    const sessionEnd = dayjs(latestSession.endTime);
    const sleepMinutes = Math.max(sessionEnd.diff(sessionStart, "minute"), 0);
    const sleepHours = Number((sleepMinutes / 60).toFixed(2));

    const qualityScoreMap = {
      excellent: 30,
      good: 24,
      fair: 16,
      poor: 8,
      unknown: 16
    };

    const qualityKey = latestSession.quality ?? "unknown";
    const qualityScore = qualityScoreMap[qualityKey] ?? qualityScoreMap.unknown;
    const durationScore = Math.min((sleepHours / 8) * 50, 50);

    const previousDayStart = sessionStart.subtract(1, "day").startOf("day");
    const previousDayEnd = previousDayStart.endOf("day");

    const workouts = await prisma.workoutLog.findMany({
      where: {
        userId,
        date: {
          gte: previousDayStart.toDate(),
          lte: previousDayEnd.toDate()
        }
      }
    });

    const intensityWeights = { low: 0.8, moderate: 1, high: 1.2 };
    let weightedLoad = 0;
    const intensityBreakdown = { low: 0, moderate: 0, high: 0 };

    workouts.forEach((workout) => {
      const intensity = workout.intensity ?? "moderate";
      const minutes = workout.durationMin ?? 0;

      if (intensityBreakdown[intensity] !== undefined) {
        intensityBreakdown[intensity] += minutes;
      }

      weightedLoad += minutes * (intensityWeights[intensity] ?? 1);
    });

    const totalWorkoutMinutes = workouts.reduce(
      (acc, workout) => acc + (workout.durationMin ?? 0),
      0
    );

    const loadPenalty = Math.min(weightedLoad / 90, 1) * 20;

    const rawScore = Math.round(
      Math.max(
        Math.min(durationScore + qualityScore + (20 - loadPenalty), 100),
        0
      )
    );

    const status = rawScore >= 80 ? "optimal" : rawScore >= 60 ? "monitor" : "fatigued";

    const recommendation = getRecoveryRecommendation(status, {
      sleepHours,
      quality: qualityKey,
      totalWorkoutMinutes,
      loadPenalty
    });

    res.json({
      score: rawScore,
      status,
      sleep: {
        durationHours: sleepHours,
        durationMinutes: sleepMinutes,
        quality: qualityKey,
        startTime: latestSession.startTime,
        endTime: latestSession.endTime,
        interruptions: latestSession.interruptions
      },
      workload: {
        date: previousDayStart.format("YYYY-MM-DD"),
        totalMinutes: totalWorkoutMinutes,
        weightedLoad: Number(weightedLoad.toFixed(1)),
        intensityBreakdown
      },
      recommendation
    });
  })
);
sleepRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = sleepSessionSchema.parse(req.body);
    const userId = req.user.id;

    const startTime = dayjs(payload.startTime);
    const endTime = dayjs(payload.endTime);

    if (!startTime.isValid() || !endTime.isValid() || endTime.isBefore(startTime)) {
      return res.status(400).json({ message: "Invalid sleep session time range" });
    }

    const session = await prisma.sleepSession.create({
      data: {
        userId,
        startTime: startTime.toDate(),
        endTime: endTime.toDate(),
        quality: payload.quality,
        interruptions: payload.interruptions ?? 0,
        notes: payload.notes ?? null
      }
    });

    res.status(201).json({ session });
  })
);

sleepRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = updateSleepSchema.parse(req.body);
    const userId = req.user.id;

    const existing = await prisma.sleepSession.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ message: "Sleep session not found" });
    }

    const data = {};

    if (payload.startTime !== undefined || payload.endTime !== undefined) {
      const startTime = payload.startTime ? dayjs(payload.startTime) : dayjs(existing.startTime);
      const endTime = payload.endTime ? dayjs(payload.endTime) : dayjs(existing.endTime);

      if (!startTime.isValid() || !endTime.isValid() || endTime.isBefore(startTime)) {
        return res.status(400).json({ message: "Invalid sleep session time range" });
      }

      data.startTime = startTime.toDate();
      data.endTime = endTime.toDate();
    }

    if (payload.quality !== undefined) data.quality = payload.quality;
    if (payload.interruptions !== undefined) data.interruptions = payload.interruptions;
    if (payload.notes !== undefined) data.notes = payload.notes;

    const session = await prisma.sleepSession.update({
      where: { id },
      data
    });

    res.json({ session });
  })
);

sleepRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await prisma.sleepSession.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ message: "Sleep session not found" });
    }

    await prisma.sleepSession.delete({ where: { id } });

    res.status(204).end();
  })
);
