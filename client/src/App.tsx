import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BookingProvider } from "@/contexts/booking-context";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Onboarding from "@/pages/onboarding";
import PlacementQuiz from "@/pages/placement-quiz";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/use-auth";
import AdminOverview from "@/pages/admin/overview";
import AdminCourses from "@/pages/admin/courses";
import AdminCourseLessons from "@/pages/admin/course-lessons";
import AdminLessonQuiz from "@/pages/admin/lesson-quiz";
import AdminLessonUpload from "@/pages/admin/lesson-upload";
import AdminStudents from "@/pages/admin/students";
import AdminFinancials from "@/pages/admin/financials";
import AdminAnalytics from "@/pages/admin/analytics";
import AdminLabs from "@/pages/admin/labs";
import AdminInstructors from "@/pages/admin/instructors";
import AdminOnboarding from "@/pages/admin/onboarding";
import AdminLeads from "@/pages/admin/leads";
import AdminTeam from "@/pages/admin/team";
import SobreNosotros from "@/pages/sobre-nosotros";
import Legal from "@/pages/legal";
import PurchaseComplete from "@/pages/purchase-complete";
import ChoosePlan from "@/pages/choose-plan";
import AcceptInvitation from "@/pages/accept-invitation";
import ActivatePage from "@/pages/activate";
import VerifyEmailPage from "@/pages/verify-email";
import { CookieConsent } from "@/components/cookie-consent";
import { Loader2 } from "lucide-react";

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" data-testid="loading-spinner">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

// Protected route wrapper - requires auth + completed onboarding
function ProtectedRoute({ children, requireOnboarding = true }: { children: React.ReactNode; requireOnboarding?: boolean }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Redirect unauthenticated users to login (uses full page redirect for OAuth)
  if (!user) {
    window.location.href = "/api/login";
    return <LoadingSpinner />;
  }

  // Redirect users who haven't completed onboarding (using wouter)
  if (requireOnboarding && !user.onboardingCompleted) {
    return <Redirect to="/onboarding" />;
  }

  return <>{children}</>;
}

// Admin route wrapper - requires auth + admin status
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    window.location.href = "/api/login";
    return <LoadingSpinner />;
  }

  if (!user.isAdmin) {
    return <Redirect to="/dashboard" />;
  }

  return <>{children}</>;
}

// Lazy import for admin preview to avoid circular dependencies
import { CourseViewer } from "@/components/dashboard/course-viewer";

// Admin Preview Page - bypasses dashboard redirects for admin course preview
function AdminPreviewPage() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    window.location.href = "/api/login";
    return <LoadingSpinner />;
  }

  if (!user.isAdmin) {
    return <Redirect to="/dashboard" />;
  }

  return <CourseViewer isAdminPreview={true} />;
}

function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated && user) {
    if (location === "/" || location === "") {
      // Redirect admins to admin panel
      if (user.isAdmin) {
        return <Redirect to="/admin" />;
      }
      // Redirect new users who haven't completed onboarding
      if (!user.onboardingCompleted) {
        return <Redirect to="/onboarding" />;
      }
      // After onboarding, go to dashboard
      return <Redirect to="/dashboard" />;
    }
    return null;
  }

  return <LandingPage />;
}


function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/placement-quiz" component={PlacementQuiz} />
      <Route path="/purchase-complete" component={PurchaseComplete} />
      <Route path="/sobre-nosotros" component={SobreNosotros} />
      <Route path="/legal" component={Legal} />
      <Route path="/activate" component={ActivatePage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/accept-invitation" component={AcceptInvitation} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/choose-plan">
        <ProtectedRoute>
          <ChoosePlan />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/preview/courses/:courseId">
        <AdminPreviewPage />
      </Route>
      <Route path="/dashboard/*?">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/courses/:courseId/lessons/:lessonId/quiz">
        {(params) => <AdminRoute><AdminLessonQuiz /></AdminRoute>}
      </Route>
      <Route path="/admin/courses/:id/lessons">
        {(params) => <AdminRoute><AdminCourseLessons /></AdminRoute>}
      </Route>
      <Route path="/admin/courses">
        <AdminRoute><AdminCourses /></AdminRoute>
      </Route>
      <Route path="/admin/lesson-upload">
        <AdminRoute><AdminLessonUpload /></AdminRoute>
      </Route>
      <Route path="/admin/students">
        <AdminRoute><AdminStudents /></AdminRoute>
      </Route>
      <Route path="/admin/financials">
        <AdminRoute><AdminFinancials /></AdminRoute>
      </Route>
      <Route path="/admin/analytics">
        <AdminRoute><AdminAnalytics /></AdminRoute>
      </Route>
      <Route path="/admin/labs">
        <AdminRoute><AdminLabs /></AdminRoute>
      </Route>
      <Route path="/admin/instructors">
        <AdminRoute><AdminInstructors /></AdminRoute>
      </Route>
      <Route path="/admin/onboarding">
        <AdminRoute><AdminOnboarding /></AdminRoute>
      </Route>
      <Route path="/admin/leads">
        <AdminRoute><AdminLeads /></AdminRoute>
      </Route>
      <Route path="/admin/team">
        <AdminRoute><AdminTeam /></AdminRoute>
      </Route>
      <Route path="/admin">
        <AdminRoute><AdminOverview /></AdminRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BookingProvider>
          <Toaster />
          <Router />
          <CookieConsent />
        </BookingProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
