import type { Express } from "express";
import type { IStorage } from "../storage";
import { runAudioCheck } from "./audioCheck";
import { runLessonsCheck } from "./lessonsCheck";
import { runEnrollmentsCheck } from "./enrollmentsCheck";
import { runQuizzesCheck } from "./quizzesCheck";

export function registerHealthCheckRoutes(
  app: Express,
  storage: IStorage,
  requireAdmin: any
) {
  // Individual health checks
  app.get("/api/admin/health-check/audio", requireAdmin, async (_req, res) => {
    try {
      const report = await runAudioCheck(storage);
      res.json(report);
    } catch (error) {
      console.error("Audio health check failed:", error);
      res.status(500).json({ error: "Audio health check failed" });
    }
  });

  app.get("/api/admin/health-check/lessons", requireAdmin, async (_req, res) => {
    try {
      const report = await runLessonsCheck(storage);
      res.json(report);
    } catch (error) {
      console.error("Lessons health check failed:", error);
      res.status(500).json({ error: "Lessons health check failed" });
    }
  });

  app.get("/api/admin/health-check/enrollments", requireAdmin, async (_req, res) => {
    try {
      const report = await runEnrollmentsCheck(storage);
      res.json(report);
    } catch (error) {
      console.error("Enrollments health check failed:", error);
      res.status(500).json({ error: "Enrollments health check failed" });
    }
  });

  app.get("/api/admin/health-check/quizzes", requireAdmin, async (_req, res) => {
    try {
      const report = await runQuizzesCheck(storage);
      res.json(report);
    } catch (error) {
      console.error("Quizzes health check failed:", error);
      res.status(500).json({ error: "Quizzes health check failed" });
    }
  });

  // Master endpoint — runs ALL checks and returns combined report
  app.get("/api/admin/health-check", requireAdmin, async (_req, res) => {
    try {
      const startTime = Date.now();

      const [audio, lessons, enrollments, quizzes] = await Promise.all([
        runAudioCheck(storage),
        runLessonsCheck(storage),
        runEnrollmentsCheck(storage),
        runQuizzesCheck(storage),
      ]);

      const totalErrors =
        audio.summary.errors +
        lessons.summary.errors +
        enrollments.summary.errors +
        quizzes.summary.errors;

      const totalWarnings =
        audio.summary.warnings +
        lessons.summary.warnings +
        enrollments.summary.warnings +
        quizzes.summary.warnings;

      res.json({
        status: totalErrors > 0 ? "unhealthy" : totalWarnings > 0 ? "degraded" : "healthy",
        checkedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        totalErrors,
        totalWarnings,
        checks: { audio, lessons, enrollments, quizzes },
      });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(500).json({ error: "Health check failed" });
    }
  });
}
