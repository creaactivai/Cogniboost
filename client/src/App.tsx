import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BookingProvider } from "@/contexts/booking-context";
import LandingPage from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Onboarding from "@/pages/onboarding";
import PlacementQuiz from "@/pages/placement-quiz";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/use-auth";
import AdminOverview from "@/pages/admin/overview";
import AdminCourses from "@/pages/admin/courses";
import AdminCourseLessons from "@/pages/admin/course-lessons";
import AdminLessonQuiz from "@/pages/admin/lesson-quiz";
import AdminStudents from "@/pages/admin/students";
import AdminFinancials from "@/pages/admin/financials";
import AdminLabs from "@/pages/admin/labs";
import AdminInstructors from "@/pages/admin/instructors";
import AdminOnboarding from "@/pages/admin/onboarding";
import AdminLeads from "@/pages/admin/leads";

function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const currentPath = window.location.pathname;
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    if (currentPath === "/" || currentPath === "") {
      // Redirect new users who haven't completed onboarding to the onboarding wizard
      if (!user.onboardingCompleted) {
        window.location.href = "/onboarding";
        return null;
      }
      window.location.href = "/dashboard";
      return null;
    }
    return null;
  }

  return <LandingPage />;
}


function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/placement-quiz" component={PlacementQuiz} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/dashboard/*?" component={Dashboard} />
      <Route path="/admin/courses/:courseId/lessons/:lessonId/quiz" component={AdminLessonQuiz} />
      <Route path="/admin/courses/:id/lessons" component={AdminCourseLessons} />
      <Route path="/admin/courses" component={AdminCourses} />
      <Route path="/admin/students" component={AdminStudents} />
      <Route path="/admin/financials" component={AdminFinancials} />
      <Route path="/admin/labs" component={AdminLabs} />
      <Route path="/admin/instructors" component={AdminInstructors} />
      <Route path="/admin/onboarding" component={AdminOnboarding} />
      <Route path="/admin/leads" component={AdminLeads} />
      <Route path="/admin" component={AdminOverview} />
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
        </BookingProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
