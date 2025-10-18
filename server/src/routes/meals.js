import dayjs from "dayjs";
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const mealQuerySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(180).default(30)
});

const createMealSchema = z.object({
  date: z.string().optional(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).default("meal"),
  name: z.string().min(2),
  calories: z.coerce.number().int().min(0),
  proteinG: z.coerce.number().min(0).optional(),
  carbsG: z.coerce.number().min(0).optional(),
  fatG: z.coerce.number().min(0).optional(),
  notes: z.string().max(500).optional()
});

const updateMealSchema = createMealSchema.partial().refine(
  (payload) => Object.keys(payload).length > 0,
  { message: "At least one field must be provided" }
);

export const mealsRouter = Router();

mealsRouter.use(requireAuth);

mealsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { start, end, limit } = mealQuerySchema.parse(req.query);
    const userId = req.user.id;

    const endDate = end ? dayjs(end) : dayjs();
    const startDate = start ? dayjs(start) : endDate.subtract(limit - 1, "day");

    const meals = await prisma.mealLog.findMany({
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

    res.json({ meals });
  })
);

mealsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = createMealSchema.parse(req.body);
    const userId = req.user.id;

    const date = payload.date ? dayjs(payload.date) : dayjs();
    if (!date.isValid()) {
      return res.status(400).json({ message: "Invalid meal date" });
    }

    const meal = await prisma.mealLog.create({
      data: {
        userId,
        date: date.toDate(),
        mealType: payload.mealType,
        name: payload.name,
        calories: payload.calories,
        proteinG: payload.proteinG ?? 0,
        carbsG: payload.carbsG ?? 0,
        fatG: payload.fatG ?? 0,
        notes: payload.notes ?? null
      }
    });

    res.status(201).json({ meal });
  })
);

mealsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = updateMealSchema.parse(req.body);
    const userId = req.user.id;

    const existing = await prisma.mealLog.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ message: "Meal not found" });
    }

    const data = {};

    if (payload.date !== undefined) {
      const date = dayjs(payload.date);
      if (!date.isValid()) {
        return res.status(400).json({ message: "Invalid meal date" });
      }
      data.date = date.toDate();
    }

    if (payload.mealType !== undefined) data.mealType = payload.mealType;
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.calories !== undefined) data.calories = payload.calories;
    if (payload.proteinG !== undefined) data.proteinG = payload.proteinG;
    if (payload.carbsG !== undefined) data.carbsG = payload.carbsG;
    if (payload.fatG !== undefined) data.fatG = payload.fatG;
    if (payload.notes !== undefined) data.notes = payload.notes;

    const meal = await prisma.mealLog.update({
      where: { id },
      data
    });

    res.json({ meal });
  })
);

mealsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await prisma.mealLog.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ message: "Meal not found" });
    }

    await prisma.mealLog.delete({ where: { id } });

    res.status(204).end();
  })
);
