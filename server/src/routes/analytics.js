import { Router } from "express";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";

export const analyticsRouter = Router();

// Get comprehensive analytics for the user
analyticsRouter.get(
  "/dashboard",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Fetch all data for the period
    const [metrics, workouts, meals, sleep] = await Promise.all([
      prisma.dailyMetric.findMany({
        where: { 
          userId,
          date: { gte: startDate }
        },
        orderBy: { date: 'desc' }
      }),
      prisma.workoutLog.findMany({
        where: { 
          userId,
          date: { gte: startDate }
        },
        orderBy: { date: 'desc' }
      }),
      prisma.mealLog.findMany({
        where: { 
          userId,
          date: { gte: startDate }
        },
        orderBy: { date: 'desc' }
      }),
      prisma.sleepSession.findMany({
        where: { 
          userId,
          startTime: { gte: startDate }
        },
        orderBy: { startTime: 'desc' }
      })
    ]);

    // Calculate analytics
    const analytics = {
      summary: {
        totalDays: parseInt(days),
        activeDays: new Set([
          ...metrics.map(m => m.date.toISOString().split('T')[0]),
          ...workouts.map(w => w.date.toISOString().split('T')[0]),
          ...meals.map(m => m.date.toISOString().split('T')[0]),
          ...sleep.map(s => s.startTime.toISOString().split('T')[0])
        ]).size
      },
      
      fitness: {
        totalWorkouts: workouts.length,
        totalWorkoutMinutes: workouts.reduce((sum, w) => sum + w.durationMin, 0),
        averageWorkoutDuration: workouts.length > 0 ? 
          Math.round(workouts.reduce((sum, w) => sum + w.durationMin, 0) / workouts.length) : 0,
        favoriteWorkoutType: getMostFrequent(workouts.map(w => w.type)),
        caloriesBurned: workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0),
        workoutStreak: calculateWorkoutStreak(workouts)
      },
      
      nutrition: {
        totalMeals: meals.length,
        averageDailyCalories: calculateAverageDailyCalories(meals),
        macroBreakdown: calculateMacroBreakdown(meals),
        favoritemeal: getMostFrequent(meals.map(m => m.name)),
        mealDistribution: calculateMealDistribution(meals)
      },
      
      sleep: {
        totalSessions: sleep.length,
        averageSleepHours: calculateAverageSleep(sleep),
        sleepQualityDistribution: calculateSleepQuality(sleep),
        bestSleepDay: getBestSleepDay(sleep),
        sleepConsistency: calculateSleepConsistency(sleep)
      },
      
      trends: {
        weeklyProgress: calculateWeeklyProgress(metrics, workouts, meals, sleep),
        monthlyComparison: calculateMonthlyComparison(metrics, workouts, meals, sleep)
      }
    };

    res.json(analytics);
  })
);

// Get AI-powered recommendations
analyticsRouter.get(
  "/recommendations",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    // Fetch recent data for analysis
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 14); // Last 2 weeks

    const [metrics, workouts, meals, sleep] = await Promise.all([
      prisma.dailyMetric.findMany({
        where: { userId, date: { gte: recentDate } },
        orderBy: { date: 'desc' }
      }),
      prisma.workoutLog.findMany({
        where: { userId, date: { gte: recentDate } },
        orderBy: { date: 'desc' }
      }),
      prisma.mealLog.findMany({
        where: { userId, date: { gte: recentDate } },
        orderBy: { date: 'desc' }
      }),
      prisma.sleepSession.findMany({
        where: { userId, startTime: { gte: recentDate } },
        orderBy: { startTime: 'desc' }
      })
    ]);

    const recommendations = generateRecommendations(metrics, workouts, meals, sleep);
    
    res.json(recommendations);
  })
);

// Get achievement badges
analyticsRouter.get(
  "/achievements",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    const [metrics, workouts, meals, sleep] = await Promise.all([
      prisma.dailyMetric.findMany({ where: { userId } }),
      prisma.workoutLog.findMany({ where: { userId } }),
      prisma.mealLog.findMany({ where: { userId } }),
      prisma.sleepSession.findMany({ where: { userId } })
    ]);

    const achievements = calculateAchievements(metrics, workouts, meals, sleep);
    
    res.json(achievements);
  })
);

// Helper functions
function getMostFrequent(array) {
  if (array.length === 0) return null;
  
  const frequency = {};
  array.forEach(item => {
    frequency[item] = (frequency[item] || 0) + 1;
  });
  
  return Object.keys(frequency).reduce((a, b) => 
    frequency[a] > frequency[b] ? a : b
  );
}

function calculateWorkoutStreak(workouts) {
  if (workouts.length === 0) return 0;
  
  const workoutDates = [...new Set(workouts.map(w => 
    w.date.toISOString().split('T')[0]
  ))].sort().reverse();
  
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  let currentDate = new Date(today);
  
  for (const workoutDate of workoutDates) {
    const dateStr = currentDate.toISOString().split('T')[0];
    if (workoutDate === dateStr) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
}

function calculateAverageDailyCalories(meals) {
  if (meals.length === 0) return 0;
  
  const dailyCalories = {};
  meals.forEach(meal => {
    const date = meal.date.toISOString().split('T')[0];
    dailyCalories[date] = (dailyCalories[date] || 0) + meal.calories;
  });
  
  const totalDays = Object.keys(dailyCalories).length;
  const totalCalories = Object.values(dailyCalories).reduce((sum, cal) => sum + cal, 0);
  
  return totalDays > 0 ? Math.round(totalCalories / totalDays) : 0;
}

function calculateMacroBreakdown(meals) {
  const totals = meals.reduce((acc, meal) => {
    acc.protein += meal.proteinG;
    acc.carbs += meal.carbsG;
    acc.fat += meal.fatG;
    return acc;
  }, { protein: 0, carbs: 0, fat: 0 });
  
  const total = totals.protein + totals.carbs + totals.fat;
  
  if (total === 0) return { protein: 0, carbs: 0, fat: 0 };
  
  return {
    protein: Math.round((totals.protein / total) * 100),
    carbs: Math.round((totals.carbs / total) * 100),
    fat: Math.round((totals.fat / total) * 100)
  };
}

function calculateMealDistribution(meals) {
  const distribution = {};
  meals.forEach(meal => {
    distribution[meal.mealType] = (distribution[meal.mealType] || 0) + 1;
  });
  return distribution;
}

function calculateAverageSleep(sleep) {
  if (sleep.length === 0) return 0;
  
  const totalHours = sleep.reduce((sum, session) => {
    const duration = (new Date(session.endTime) - new Date(session.startTime)) / (1000 * 60 * 60);
    return sum + duration;
  }, 0);
  
  return parseFloat((totalHours / sleep.length).toFixed(1));
}

function calculateSleepQuality(sleep) {
  const distribution = {};
  sleep.forEach(session => {
    distribution[session.quality] = (distribution[session.quality] || 0) + 1;
  });
  return distribution;
}

function getBestSleepDay(sleep) {
  if (sleep.length === 0) return null;
  
  const bestSession = sleep.reduce((best, session) => {
    const duration = (new Date(session.endTime) - new Date(session.startTime)) / (1000 * 60 * 60);
    const bestDuration = best ? (new Date(best.endTime) - new Date(best.startTime)) / (1000 * 60 * 60) : 0;
    
    return duration > bestDuration && session.quality === 'excellent' ? session : best;
  }, null);
  
  return bestSession ? new Date(bestSession.startTime).toISOString().split('T')[0] : null;
}

function calculateSleepConsistency(sleep) {
  if (sleep.length < 2) return 0;
  
  const bedtimes = sleep.map(session => {
    const bedtime = new Date(session.startTime);
    return bedtime.getHours() + bedtime.getMinutes() / 60;
  });
  
  const avgBedtime = bedtimes.reduce((sum, time) => sum + time, 0) / bedtimes.length;
  const variance = bedtimes.reduce((sum, time) => sum + Math.pow(time - avgBedtime, 2), 0) / bedtimes.length;
  
  // Return consistency score (0-100, higher is more consistent)
  return Math.max(0, 100 - Math.sqrt(variance) * 10);
}

function calculateWeeklyProgress(metrics, workouts, meals, sleep) {
  // Implementation for weekly progress calculation
  const weeks = {};
  
  // Group data by week
  [...metrics, ...workouts, ...meals, ...sleep].forEach(item => {
    const date = new Date(item.date || item.startTime);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeks[weekKey]) {
      weeks[weekKey] = { workouts: 0, meals: 0, sleep: 0, metrics: 0 };
    }
    
    if (item.durationMin !== undefined) weeks[weekKey].workouts++;
    if (item.calories !== undefined && item.mealType) weeks[weekKey].meals++;
    if (item.startTime && item.endTime) weeks[weekKey].sleep++;
    if (item.steps !== undefined) weeks[weekKey].metrics++;
  });
  
  return Object.entries(weeks).map(([week, data]) => ({
    week,
    ...data
  }));
}

function calculateMonthlyComparison(metrics, workouts, meals, sleep) {
  // Implementation for monthly comparison
  const thisMonth = new Date();
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  
  const thisMonthData = filterByMonth(metrics, workouts, meals, sleep, thisMonth);
  const lastMonthData = filterByMonth(metrics, workouts, meals, sleep, lastMonth);
  
  return {
    thisMonth: calculateMonthStats(thisMonthData),
    lastMonth: calculateMonthStats(lastMonthData)
  };
}

function filterByMonth(metrics, workouts, meals, sleep, targetMonth) {
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth();
  
  return {
    metrics: metrics.filter(m => {
      const date = new Date(m.date);
      return date.getFullYear() === year && date.getMonth() === month;
    }),
    workouts: workouts.filter(w => {
      const date = new Date(w.date);
      return date.getFullYear() === year && date.getMonth() === month;
    }),
    meals: meals.filter(m => {
      const date = new Date(m.date);
      return date.getFullYear() === year && date.getMonth() === month;
    }),
    sleep: sleep.filter(s => {
      const date = new Date(s.startTime);
      return date.getFullYear() === year && date.getMonth() === month;
    })
  };
}

function calculateMonthStats(data) {
  return {
    workouts: data.workouts.length,
    meals: data.meals.length,
    sleepSessions: data.sleep.length,
    avgCalories: calculateAverageDailyCalories(data.meals),
    avgSleep: calculateAverageSleep(data.sleep)
  };
}

function generateRecommendations(metrics, workouts, meals, sleep) {
  const recommendations = [];
  
  // Workout recommendations
  if (workouts.length < 3) {
    recommendations.push({
      type: 'fitness',
      priority: 'high',
      title: 'Increase Workout Frequency',
      message: 'Try to aim for at least 3 workouts per week for optimal health benefits.',
      action: 'Schedule 2-3 more workouts this week',
      icon: '💪'
    });
  }
  
  // Sleep recommendations
  const avgSleep = calculateAverageSleep(sleep);
  if (avgSleep < 7) {
    recommendations.push({
      type: 'sleep',
      priority: 'high',
      title: 'Improve Sleep Duration',
      message: `You're averaging ${avgSleep.toFixed(1)} hours of sleep. Aim for 7-9 hours for better recovery.`,
      action: 'Set a consistent bedtime routine',
      icon: '😴'
    });
  }
  
  // Nutrition recommendations
  const avgCalories = calculateAverageDailyCalories(meals);
  if (avgCalories < 1500) {
    recommendations.push({
      type: 'nutrition',
      priority: 'medium',
      title: 'Increase Caloric Intake',
      message: 'Your average daily calories seem low. Make sure you\'re eating enough to fuel your activities.',
      action: 'Add healthy snacks between meals',
      icon: '🍎'
    });
  }
  
  // Hydration recommendations
  const avgWater = metrics.reduce((sum, m) => sum + m.waterIntakeOz, 0) / Math.max(metrics.length, 1);
  if (avgWater < 64) {
    recommendations.push({
      type: 'hydration',
      priority: 'medium',
      title: 'Stay Hydrated',
      message: 'Increase your daily water intake to at least 64oz for optimal health.',
      action: 'Set hourly water reminders',
      icon: '💧'
    });
  }
  
  // Activity recommendations
  const workoutTypes = [...new Set(workouts.map(w => w.type))];
  if (workoutTypes.length < 2) {
    recommendations.push({
      type: 'variety',
      priority: 'low',
      title: 'Mix Up Your Workouts',
      message: 'Try different types of exercises to work different muscle groups and prevent boredom.',
      action: 'Try a new workout type this week',
      icon: '🏃'
    });
  }
  
  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

function calculateAchievements(metrics, workouts, meals, sleep) {
  const achievements = [];
  
  // Workout achievements
  if (workouts.length >= 1) {
    achievements.push({
      id: 'first_workout',
      title: 'First Steps',
      description: 'Logged your first workout',
      icon: '🏃',
      earned: true,
      earnedDate: workouts[workouts.length - 1].date
    });
  }
  
  if (workouts.length >= 10) {
    achievements.push({
      id: 'workout_warrior',
      title: 'Workout Warrior',
      description: 'Completed 10 workouts',
      icon: '💪',
      earned: true,
      earnedDate: workouts[9].date
    });
  }
  
  if (workouts.length >= 50) {
    achievements.push({
      id: 'fitness_fanatic',
      title: 'Fitness Fanatic',
      description: 'Completed 50 workouts',
      icon: '🔥',
      earned: true,
      earnedDate: workouts[49].date
    });
  }
  
  // Sleep achievements
  const goodSleepSessions = sleep.filter(s => {
    const duration = (new Date(s.endTime) - new Date(s.startTime)) / (1000 * 60 * 60);
    return duration >= 7 && duration <= 9 && s.quality === 'good' || s.quality === 'excellent';
  });
  
  if (goodSleepSessions.length >= 7) {
    achievements.push({
      id: 'sleep_master',
      title: 'Sleep Master',
      description: 'Had 7 nights of quality sleep',
      icon: '😴',
      earned: true,
      earnedDate: goodSleepSessions[6].startTime
    });
  }
  
  // Nutrition achievements
  if (meals.length >= 1) {
    achievements.push({
      id: 'nutrition_tracker',
      title: 'Nutrition Tracker',
      description: 'Logged your first meal',
      icon: '🍎',
      earned: true,
      earnedDate: meals[meals.length - 1].date
    });
  }
  
  // Streak achievements
  const workoutStreak = calculateWorkoutStreak(workouts);
  if (workoutStreak >= 7) {
    achievements.push({
      id: 'week_streak',
      title: 'Week Warrior',
      description: 'Worked out 7 days in a row',
      icon: '🔥',
      earned: true,
      earnedDate: new Date()
    });
  }
  
  // Add potential achievements (not yet earned)
  const potentialAchievements = [
    {
      id: 'century_club',
      title: 'Century Club',
      description: 'Complete 100 workouts',
      icon: '💯',
      earned: false,
      progress: Math.min(workouts.length, 100),
      target: 100
    },
    {
      id: 'sleep_champion',
      title: 'Sleep Champion',
      description: 'Log 30 nights of quality sleep',
      icon: '🏆',
      earned: false,
      progress: Math.min(goodSleepSessions.length, 30),
      target: 30
    }
  ];
  
  return [...achievements, ...potentialAchievements];
}
