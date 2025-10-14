import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";

const goalSchema = z.object({
  type: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  targetValue: z.number().positive(),
  unit: z.string().min(1).max(20),
  targetDate: z.string().datetime().optional()
});

const updateGoalSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  targetValue: z.number().positive().optional(),
  currentValue: z.number().min(0).optional(),
  unit: z.string().min(1).max(20).optional(),
  targetDate: z.string().datetime().optional(),
  status: z.enum(['active', 'completed', 'paused']).optional()
});

export const goalsRouter = Router();

// Get all goals for user
goalsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const goals = await prisma.goal.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate progress for each goal
    const goalsWithProgress = goals.map(goal => ({
      ...goal,
      progress: goal.targetValue > 0 ? (goal.currentValue / goal.targetValue) * 100 : 0,
      daysRemaining: goal.targetDate ? 
        Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24)) : null
    }));

    res.json(goalsWithProgress);
  })
);

// Create new goal
goalsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = goalSchema.parse(req.body);

    const goal = await prisma.goal.create({
      data: {
        ...payload,
        userId: req.user.id,
        targetDate: payload.targetDate ? new Date(payload.targetDate) : null
      }
    });

    res.status(201).json(goal);
  })
);

// Update goal
goalsRouter.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = updateGoalSchema.parse(req.body);

    const goal = await prisma.goal.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: {
        ...payload,
        targetDate: payload.targetDate ? new Date(payload.targetDate) : undefined,
        updatedAt: new Date()
      }
    });

    res.json(updatedGoal);
  })
);

// Delete goal
goalsRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const goal = await prisma.goal.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    await prisma.goal.delete({ where: { id } });

    res.json({ message: "Goal deleted successfully" });
  })
);

// Update goal progress
goalsRouter.patch(
  "/:id/progress",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { currentValue } = req.body;

    if (typeof currentValue !== 'number' || currentValue < 0) {
      return res.status(400).json({ message: "Invalid current value" });
    }

    const goal = await prisma.goal.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    // Check if goal is completed
    const status = currentValue >= goal.targetValue ? 'completed' : goal.status;

    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: {
        currentValue,
        status,
        updatedAt: new Date()
      }
    });

    res.json(updatedGoal);
  })
);

// Get goal templates/suggestions
goalsRouter.get(
  "/templates",
  requireAuth,
  asyncHandler(async (req, res) => {
    const templates = [
      {
        type: 'weight_loss',
        title: 'Lose Weight',
        description: 'Set a target weight to reach',
        suggestedUnit: 'lbs',
        category: 'Health'
      },
      {
        type: 'muscle_gain',
        title: 'Build Muscle',
        description: 'Increase muscle mass',
        suggestedUnit: 'lbs',
        category: 'Fitness'
      },
      {
        type: 'endurance',
        title: 'Run Distance',
        description: 'Complete a specific running distance',
        suggestedUnit: 'miles',
        category: 'Cardio'
      },
      {
        type: 'strength',
        title: 'Lift Weight',
        description: 'Achieve a strength milestone',
        suggestedUnit: 'lbs',
        category: 'Strength'
      },
      {
        type: 'consistency',
        title: 'Workout Streak',
        description: 'Maintain a workout streak',
        suggestedUnit: 'days',
        category: 'Habit'
      },
      {
        type: 'steps',
        title: 'Daily Steps',
        description: 'Reach daily step goal',
        suggestedUnit: 'steps',
        category: 'Activity'
      },
      {
        type: 'sleep',
        title: 'Sleep Quality',
        description: 'Improve sleep consistency',
        suggestedUnit: 'nights',
        category: 'Recovery'
      },
      {
        type: 'nutrition',
        title: 'Calorie Target',
        description: 'Meet daily calorie goals',
        suggestedUnit: 'days',
        category: 'Nutrition'
      }
    ];

    res.json(templates);
  })
);

// Get goal statistics
goalsRouter.get(
  "/stats",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const [totalGoals, activeGoals, completedGoals, overdueGoals] = await Promise.all([
      prisma.goal.count({ where: { userId } }),
      prisma.goal.count({ where: { userId, status: 'active' } }),
      prisma.goal.count({ where: { userId, status: 'completed' } }),
      prisma.goal.count({ 
        where: { 
          userId, 
          status: 'active',
          targetDate: { lt: new Date() }
        } 
      })
    ]);

    const recentlyCompleted = await prisma.goal.findMany({
      where: { 
        userId, 
        status: 'completed',
        updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      },
      orderBy: { updatedAt: 'desc' },
      take: 5
    });

    const stats = {
      total: totalGoals,
      active: activeGoals,
      completed: completedGoals,
      overdue: overdueGoals,
      completionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0,
      recentlyCompleted
    };

    res.json(stats);
  })
);
