import { Route, Switch, useLocation } from "wouter";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { DashboardOverview } from "@/components/dashboard/overview";
import { CourseCatalog } from "@/components/dashboard/course-catalog";
import { CourseViewer } from "@/components/dashboard/course-viewer";
import { ConversationLabs } from "@/components/dashboard/conversation-labs";
import { ProgressTracking } from "@/components/dashboard/progress-tracking";
import { Settings } from "@/components/dashboard/settings";
import { EmailVerificationBanner } from "@/components/dashboard/email-verification-banner";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import type { Subscription } from "@shared/schema";

const ANONYMOUS_ID_KEY = "cogniboost_anonymous_id";

function HelpSupport() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display uppercase mb-2">Ayuda y Soporte</h1>
        <p className="font-mono text-muted-foreground">
          Obtén ayuda con tu camino de aprendizaje
        </p>
      </div>
      <div className="grid gap-4 max-w-2xl">
        <div className="p-6 border border-border hover-elevate">
          <h3 className="font-mono font-semibold mb-2">Preguntas Frecuentes</h3>
          <p className="text-sm font-mono text-muted-foreground">
            Encuentra respuestas a preguntas comunes sobre cursos, labs y tu cuenta.
          </p>
        </div>
        <div className="p-6 border border-border hover-elevate">
          <h3 className="font-mono font-semibold mb-2">Contactar Soporte</h3>
          <p className="text-sm font-mono text-muted-foreground">
            Escríbenos a support@cogniboost.co para asistencia personalizada.
          </p>
        </div>
        <div className="p-6 border border-border hover-elevate">
          <h3 className="font-mono font-semibold mb-2">Comunidad</h3>
          <p className="text-sm font-mono text-muted-foreground">
            Únete a nuestra comunidad de Discord para conectar con otros estudiantes.
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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }
    
    // Redirect admins to admin panel
    if (!isLoading && isAuthenticated && user?.isAdmin) {
      setLocation("/admin");
      return;
    }
    
    // Redirect users who haven't completed onboarding
    if (!isLoading && isAuthenticated && user && !user.onboardingCompleted) {
      setLocation("/onboarding");
      return;
    }
    
    // Check subscription - only allow paid users to access dashboard
    if (!isLoading && !subscriptionLoading && isAuthenticated && user?.onboardingCompleted) {
      const tier = subscription?.tier || "free";
      if (tier === "free") {
        // Redirect free users to choose a plan
        setLocation("/choose-plan");
        return;
      }
    }
  }, [isLoading, isAuthenticated, user, subscription, subscriptionLoading, setLocation]);

  if (isLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="font-mono text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Don't render dashboard for free tier users
  const tier = subscription?.tier || "free";
  if (tier === "free" && user?.onboardingCompleted) {
    return null;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
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
              <Route path="/dashboard/labs" component={ConversationLabs} />
              <Route path="/dashboard/progress" component={ProgressTracking} />
              <Route path="/dashboard/settings" component={Settings} />
              <Route path="/dashboard/help" component={HelpSupport} />
              <Route path="/dashboard" component={DashboardOverview} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
