import { Route, Switch, useRoute, useLocation } from "wouter";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { DashboardOverview } from "@/components/dashboard/overview";
import { CourseCatalog } from "@/components/dashboard/course-catalog";
import { CourseViewer } from "@/components/dashboard/course-viewer";
import { ConversationLabs } from "@/components/dashboard/conversation-labs";
import { ProgressTracking } from "@/components/dashboard/progress-tracking";
import { Settings } from "@/components/dashboard/settings";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

function HelpSupport() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display uppercase mb-2">Help & Support</h1>
        <p className="font-mono text-muted-foreground">
          Get help with your learning journey
        </p>
      </div>
      <div className="grid gap-4 max-w-2xl">
        <div className="p-6 border border-border hover-elevate">
          <h3 className="font-mono font-semibold mb-2">FAQs</h3>
          <p className="text-sm font-mono text-muted-foreground">
            Find answers to common questions about courses, labs, and your account.
          </p>
        </div>
        <div className="p-6 border border-border hover-elevate">
          <h3 className="font-mono font-semibold mb-2">Contact Support</h3>
          <p className="text-sm font-mono text-muted-foreground">
            Email us at support@cogniboost.co for personalized assistance.
          </p>
        </div>
        <div className="p-6 border border-border hover-elevate">
          <h3 className="font-mono font-semibold mb-2">Community</h3>
          <p className="text-sm font-mono text-muted-foreground">
            Join our Discord community to connect with other learners.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [wouterLocation] = useLocation();
  const browserPath = window.location.pathname;
  
  console.log("Dashboard wouter location:", wouterLocation, "Browser path:", browserPath);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
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
