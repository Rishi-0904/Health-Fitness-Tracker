import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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
