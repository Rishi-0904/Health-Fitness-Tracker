import { Router } from "express";

import {
  fetchDashboardAnalytics,
  generateUserRecommendations,
  calculateUserAchievements
} from "../modules/analytics/analyticsService.js";
import { sendNotification } from "../modules/notifications/notificationService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";

export const analyticsRouter = Router();

// Get comprehensive analytics for the user
analyticsRouter.get(
  "/dashboard",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { days } = req.query;

    const analytics = await fetchDashboardAnalytics(userId, { days });

    res.json(analytics);
  })
);

// Get AI-powered recommendations
analyticsRouter.get(
  "/recommendations",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const recommendations = await generateUserRecommendations(userId, req.query);

    if (recommendations.length > 0) {
      sendNotification({
        userId,
        type: "analytics.recommendations",
        payload: { count: recommendations.length }
      });
    }

    res.json(recommendations);
  })
);

// Get achievement badges
analyticsRouter.get(
  "/achievements",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const achievements = await calculateUserAchievements(userId);

    res.json(achievements);
  })
);
