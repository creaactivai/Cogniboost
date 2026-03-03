export type SubscriptionTier = "free" | "flex" | "basic" | "premium";

export interface TierLimits {
  hasLabsAccess: boolean;
  weeklyLabLimit: number | null;
  monthlyLabLimit: number | null;
  hasFullCourseAccess: boolean;
  freeModuleLessonsLimit: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    hasLabsAccess: false,
    weeklyLabLimit: null,
    monthlyLabLimit: null,
    hasFullCourseAccess: false,
    freeModuleLessonsLimit: 3,
  },
  flex: {
    hasLabsAccess: true,
    weeklyLabLimit: null,
    monthlyLabLimit: 1,
    hasFullCourseAccess: true,
    freeModuleLessonsLimit: Infinity,
  },
  basic: {
    hasLabsAccess: true,
    weeklyLabLimit: 2,
    monthlyLabLimit: null,
    hasFullCourseAccess: true,
    freeModuleLessonsLimit: Infinity,
  },
  premium: {
    hasLabsAccess: true,
    weeklyLabLimit: null,
    monthlyLabLimit: null,
    hasFullCourseAccess: true,
    freeModuleLessonsLimit: Infinity,
  },
};

export function getTierLimits(tier: SubscriptionTier | undefined): TierLimits {
  return TIER_LIMITS[tier || "free"];
}

export function canAccessLabs(tier: SubscriptionTier | undefined): boolean {
  return getTierLimits(tier).hasLabsAccess;
}

export function getWeeklyLabLimit(tier: SubscriptionTier | undefined): number | null {
  return getTierLimits(tier).weeklyLabLimit;
}

export function getMonthlyLabLimit(tier: SubscriptionTier | undefined): number | null {
  return getTierLimits(tier).monthlyLabLimit;
}

export function canBookMoreLabs(
  tier: SubscriptionTier | undefined,
  currentWeeklyBookings: number,
  currentMonthlyBookings?: number
): boolean {
  const limits = getTierLimits(tier);
  if (!limits.hasLabsAccess) return false;

  // Check monthly limit first (for Flex plan)
  if (limits.monthlyLabLimit !== null) {
    return (currentMonthlyBookings ?? 0) < limits.monthlyLabLimit;
  }

  // Check weekly limit (for Basic plan)
  if (limits.weeklyLabLimit !== null) {
    return currentWeeklyBookings < limits.weeklyLabLimit;
  }

  // No limit (Premium)
  return true;
}

export function isLessonAccessible(
  tier: SubscriptionTier | undefined,
  moduleIndex: number,
  lessonIndexInModule: number
): boolean {
  const limits = getTierLimits(tier);
  if (limits.hasFullCourseAccess) return true;
  if (moduleIndex === 0 && lessonIndexInModule < limits.freeModuleLessonsLimit) return true;
  return false;
}

export function getTierDisplayName(tier: SubscriptionTier | undefined): string {
  const names: Record<SubscriptionTier, string> = {
    free: "Free",
    flex: "Flex",
    basic: "Standard",
    premium: "Premium",
  };
  return names[tier || "free"];
}

export function getUpgradeTierForLabs(tier: SubscriptionTier | undefined): SubscriptionTier {
  if (tier === "free") return "flex";
  return "premium";
}

export function getStartOfCurrentWeek(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const startOfWeek = new Date(now.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
}

export function getStartOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}
