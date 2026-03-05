import type { IStorage } from "../storage";

export interface EnrollmentsCheckReport {
  check: "enrollments";
  summary: {
    totalEnrollments: number;
    activeSubscriptions: number;
    expiredSubscriptions: number;
    noSubscription: number;
    staleProgress: number;
    errors: number;
    warnings: number;
  };
  issues: Array<{
    userId: string;
    status: "warning" | "error";
    issue: string;
  }>;
}

export async function runEnrollmentsCheck(storage: IStorage): Promise<EnrollmentsCheckReport> {
  const enrollments = await storage.getAllEnrollments();
  const subscriptions = await storage.getAllSubscriptions();
  const userStats = await storage.getAllUserStats();
  const issues: EnrollmentsCheckReport["issues"] = [];

  const subsByUser = new Map(subscriptions.map(s => [s.userId, s]));
  const statsByUser = new Map(userStats.map(s => [s.userId, s]));

  let activeSubscriptions = 0;
  let expiredSubscriptions = 0;
  let noSubscription = 0;
  let staleProgress = 0;

  // Get unique enrolled users
  const enrolledUserIds = [...new Set(enrollments.map(e => e.userId))];

  for (const userId of enrolledUserIds) {
    const sub = subsByUser.get(userId);
    const stats = statsByUser.get(userId);

    if (!sub) {
      noSubscription++;
    } else if (sub.status === "active") {
      activeSubscriptions++;
    } else {
      expiredSubscriptions++;
      // Check if they had recent activity despite expired subscription
      if (stats?.lastActiveAt) {
        const lastActive = new Date(stats.lastActiveAt);
        const daysSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceActive < 7) {
          issues.push({
            userId,
            status: "warning",
            issue: `Expired subscription but active within ${Math.round(daysSinceActive)} days — may need renewal reminder`,
          });
        }
      }
    }

    // Check for stale progress — enrolled but no activity in 30+ days
    if (stats?.lastActiveAt) {
      const lastActive = new Date(stats.lastActiveAt);
      const daysSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActive > 30) {
        staleProgress++;
        issues.push({
          userId,
          status: "warning",
          issue: `No activity in ${Math.round(daysSinceActive)} days — at-risk student`,
        });
      }
    }
  }

  return {
    check: "enrollments",
    summary: {
      totalEnrollments: enrollments.length,
      activeSubscriptions,
      expiredSubscriptions,
      noSubscription,
      staleProgress,
      errors: issues.filter(i => i.status === "error").length,
      warnings: issues.filter(i => i.status === "warning").length,
    },
    issues,
  };
}
