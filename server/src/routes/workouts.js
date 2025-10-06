import dayjs from "dayjs";
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const workoutQuerySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(180).default(30)
});

const createWorkoutSchema = z.object({
  date: z.string().optional(),
  type: z.string().min(2),
  intensity: z.enum(["low", "moderate", "high"]).default("moderate"),
  durationMin: z.coerce.number().int().min(1),
  caloriesBurned: z.coerce.number().int().min(0).optional(),
  notes: z.string().max(500).optional()
});

export const workoutsRouter = Router();

workoutsRouter.use(requireAuth);

workoutsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { start, end, limit } = workoutQuerySchema.parse(req.query);
    const userId = req.user.id;

    const endDate = end ? dayjs(end) : dayjs();
    const startDate = start ? dayjs(start) : endDate.subtract(limit - 1, "day");

    const workouts = await prisma.workoutLog.findMany({
      where: {
        userId,
        date: {
          gte: startDate.startOf("day").toDate(),
          lte: endDate.endOf("day").toDate()
        }
      },
      orderBy: { date: "desc" },
      take: limit
    });

    res.json({ workouts });
  })
);

workoutsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = createWorkoutSchema.parse(req.body);
    const userId = req.user.id;

    const date = payload.date ? dayjs(payload.date) : dayjs();
    if (!date.isValid()) {
      return res.status(400).json({ message: "Invalid workout date" });
    }

    const workout = await prisma.workoutLog.create({
      data: {
        userId,
        date: date.toDate(),
        type: payload.type,
        intensity: payload.intensity,
        durationMin: payload.durationMin,
        caloriesBurned: payload.caloriesBurned ?? null,
        notes: payload.notes ?? null
      }
    });

    res.status(201).json({ workout });
  })
);
