import { Route, Switch, useLocation } from "wouter";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { DashboardOverview } from "@/components/dashboard/overview";
import { CourseCatalog } from "@/components/dashboard/course-catalog";
import { CourseViewer } from "@/components/dashboard/course-viewer";
import { ConversationLabs } from "@/components/dashboard/conversation-labs";
import { ConversationLabsV2 } from "@/components/dashboard/conversation-labs-v2";
import { ProgressTracking } from "@/components/dashboard/progress-tracking";
import { Settings } from "@/components/dashboard/settings";
import { EmailVerificationBanner } from "@/components/dashboard/email-verification-banner";
import { AiTutorChat } from "@/components/dashboard/ai-tutor-chat";
import WritingAssignmentPage from "@/pages/writing-assignment";
import MyWritingsPage from "@/pages/my-writings";
import FinalExamsPage from "@/pages/final-exams";
import ExamTakePage from "@/pages/exam-take";
import ExamResultPage from "@/pages/exam-result";
import ReadingAssignmentPage from "@/pages/reading-assignment";
import ReadingSubmissionViewPage from "@/pages/reading-submission-view";
import SubmissionViewPage from "@/pages/submission-view";
import SpeakingAssignmentPage from "@/pages/speaking-assignment";
import SpeakingSubmissionViewPage from "@/pages/speaking-submission-view";
import WritingProjectAssignmentPage from "@/pages/writing-project-assignment";
import WritingProjectSubmissionViewPage from "@/pages/writing-project-submission-view";
import LabRoomPage from "@/pages/lab-room";
import TeacherGradingQueuePage from "@/pages/teacher-grading-queue";
import TeacherSubmissionReviewPage from "@/pages/teacher-submission-review";
import TeacherSpeakingReviewPage from "@/pages/teacher-speaking-review";
import TeacherLessonLibraryPage from "@/pages/teacher-lesson-library";
import TeacherLessonPlanPage from "@/pages/teacher-lesson-plan";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/lib/i18n";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import type { Subscription } from "@shared/schema";

const ANONYMOUS_ID_KEY = "cogniboost_anonymous_id";

function HelpSupport() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display uppercase mb-2">{t("help.title")}</h1>
        <p className="font-mono text-muted-foreground">
          {t("help.subtitle")}
        </p>
      </div>
      <div className="grid gap-4 max-w-2xl">
        <div className="p-6 border border-border hover-elevate">
          <h3 className="font-mono font-semibold mb-2">{t("help.faq")}</h3>
          <p className="text-sm font-mono text-muted-foreground">
            {t("help.faqDesc")}
          </p>
        </div>
        <div className="p-6 border border-border hover-elevate">
          <h3 className="font-mono font-semibold mb-2">{t("help.contact")}</h3>
          <p className="text-sm font-mono text-muted-foreground">
            {t("help.contactDesc")}
          </p>
        </div>
        <div className="p-6 border border-border hover-elevate">
          <h3 className="font-mono font-semibold mb-2">{t("help.community")}</h3>
          <p className="text-sm font-mono text-muted-foreground">
            {t("help.communityDesc")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const claimAttemptedRef = useRef(false);

  // Fetch user subscription to verify access
  const { data: subscription, isLoading: subscriptionLoading } = useQuery<Subscription>({
    queryKey: ["/api/subscription"],
    enabled: isAuthenticated,
  });

  // Fallback: Claim anonymous quiz results if user doesn't have placement level yet
  useEffect(() => {
    const claimAnonymousQuiz = async () => {
      if (!user || claimAttemptedRef.current || user.placementLevel) return;
      claimAttemptedRef.current = true;
      
      const anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY);
      if (!anonymousId) return;
      
      try {
        const response = await apiRequest("POST", "/api/placement/claim", { anonymousId });
        const data = await response.json();
        
        if (data.claimed) {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          console.log("Claimed anonymous quiz results:", data.computedLevel);
        }
      } catch (error) {
        console.error("Failed to claim anonymous quiz:", error);
      }
    };
    
    if (user && !user.placementLevel) {
      claimAnonymousQuiz();
    }
  }, [user, queryClient]);

  // Capture admin preview mode from URL on initial mount (before any redirects)
  const isAdminPreviewRef = useRef(
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === 'admin'
  );
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    
    // Check if this is admin preview mode (URL param captured on mount + admin user)
    const isAdminPreview = user?.isAdmin && isAdminPreviewRef.current;

    // Teacher review surfaces live under /dashboard/teacher and ARE meant
    // for admin/teacher use. Don't bounce admins away from them.
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const isTeacherSurface = path.startsWith('/dashboard/teacher');

    // Redirect admins to admin panel (unless they're in preview mode for
    // courses or on a teacher-only surface)
    if (!isLoading && isAuthenticated && user?.isAdmin && !isAdminPreview && !isTeacherSurface) {
      setLocation("/admin");
      return;
    }
    
    // Redirect users who haven't completed onboarding (skip for admin
    // preview, skip for admin/teacher users — they never need student
    // onboarding even if the flag was never set).
    if (
      !isLoading
      && isAuthenticated
      && user
      && !user.onboardingCompleted
      && !isAdminPreview
      && !user.isAdmin
    ) {
      setLocation("/onboarding");
      return;
    }
    
    // Note: Free users can access dashboard with limited content (first 3 lessons of Module 1)
    // Content gating is handled at the lesson/course level, not dashboard access
  }, [isLoading, isAuthenticated, user, setLocation]);

  if (isLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="font-mono text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Free tier users can access dashboard with limited content
  // Content gating is handled at the lesson/course level

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // When an admin is on a teacher-only surface (/dashboard/teacher/*),
  // show the AdminSidebar instead of the student-facing AppSidebar so
  // they stay in a consistent admin navigation context. Students never
  // hit those routes (they're admin-only).
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  const isTeacherSurface = path.startsWith('/dashboard/teacher');
  const useAdminChrome = !!user?.isAdmin && isTeacherSurface;

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        {useAdminChrome ? <AdminSidebar /> : <AppSidebar />}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 border-b border-border bg-background/80 backdrop-blur-md">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>

          {/* Email verification banner */}
          <EmailVerificationBanner />

          {/* Main content */}
          <main className="flex-1 p-6 overflow-auto">
            <Switch>
              <Route path="/dashboard/courses/:courseId/lessons/:lessonId" component={CourseViewer} />
              <Route path="/dashboard/courses/:courseId" component={CourseViewer} />
              <Route path="/dashboard/courses" component={CourseCatalog} />
              <Route path="/dashboard/labs" component={ConversationLabsV2} />
              <Route path="/dashboard/labs-legacy" component={ConversationLabs} />
              <Route path="/dashboard/labs/:sessionId/room" component={LabRoomPage} />
              <Route path="/dashboard/progress" component={ProgressTracking} />
              <Route path="/dashboard/settings" component={Settings} />
              <Route path="/dashboard/help" component={HelpSupport} />
              {/* Phase 1.8 — Reading Comprehension per module */}
              <Route path="/dashboard/reading/:moduleId" component={ReadingAssignmentPage} />
              <Route path="/dashboard/reading-submissions/:id" component={ReadingSubmissionViewPage} />
              {/* Phase 1.7 — CEFR Mastery Final Exams + Certificates */}
              <Route path="/dashboard/exams" component={FinalExamsPage} />
              <Route path="/dashboard/exam/:level/result/:attemptId" component={ExamResultPage} />
              <Route path="/dashboard/exam/:level" component={ExamTakePage} />
              {/* Phase 1 — AI-graded writing (Master Plan v2.0 §4) */}
              <Route path="/dashboard/my-writings" component={MyWritingsPage} />
              <Route path="/dashboard/writing/new" component={WritingAssignmentPage} />
              <Route path="/dashboard/submissions/:id" component={SubmissionViewPage} />
              <Route path="/dashboard/speaking/:moduleId" component={SpeakingAssignmentPage} />
              <Route path="/dashboard/speaking-submissions/:id" component={SpeakingSubmissionViewPage} />
              <Route path="/dashboard/writing-project/:moduleId" component={WritingProjectAssignmentPage} />
              <Route path="/dashboard/writing-project-submissions/:id" component={WritingProjectSubmissionViewPage} />
              {/* Phase 1 — Teacher review surface (Master Plan v2.0 §4.4 + §7.1) */}
              <Route path="/dashboard/teacher/submissions/:id" component={TeacherSubmissionReviewPage} />
              <Route path="/dashboard/teacher/speaking/:id" component={TeacherSpeakingReviewPage} />
              {/* Phase 1.5 — Lesson Library (Master Plan v2.0 §7.4) */}
              <Route path="/dashboard/teacher/lessons/:id" component={TeacherLessonPlanPage} />
              <Route path="/dashboard/teacher/lessons" component={TeacherLessonLibraryPage} />
              <Route path="/dashboard/teacher" component={TeacherGradingQueuePage} />
              <Route path="/dashboard" component={DashboardOverview} />
            </Switch>
          </main>

          {/* AI Tutor Chat - floating component */}
          <AiTutorChat />
        </div>
      </div>
    </SidebarProvider>
  );
}
