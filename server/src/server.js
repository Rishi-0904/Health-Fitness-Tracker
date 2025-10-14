import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { dailyMetricsRouter } from "./routes/metrics.js";
import { workoutsRouter } from "./routes/workouts.js";
import { mealsRouter } from "./routes/meals.js";
import { sleepRouter } from "./routes/sleep.js";
import { wearableRouter } from "./routes/wearables.js";
import { analyticsRouter } from "./routes/analytics.js";
import { goalsRouter } from "./routes/goals.js";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/auth", authRouter);
app.use("/metrics", dailyMetricsRouter);
app.use("/workouts", workoutsRouter);
app.use("/meals", mealsRouter);
app.use("/sleep", sleepRouter);
app.use("/wearables", wearableRouter);
app.use("/analytics", analyticsRouter);
app.use("/goals", goalsRouter);

app.use((err, _req, res, _next) => {
  console.error("Unhandled error", err);
  res.status(500).json({ message: "Internal server error" });
});
