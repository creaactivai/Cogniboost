import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  BookOpen,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  Home,
  LogOut,
  GraduationCap,
  Globe,
  PenLine,
  ClipboardList,
  Library,
  Award,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation, type Locale } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserStats } from "@shared/schema";

const LEVEL_LABEL: Record<string, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper Int.",
  C1: "Advanced",
};

// Shared className for active sidebar entry — Option B styling:
// drop the full cyan bg in favour of a thin cyan accent bar on the
// left + a subtle cyan-tinted bg, so the active item reads as
// "highlighted" without dominating the whole row.
const ACTIVE_NAV_CLASSES =
  "relative data-[active=true]:bg-sidebar-accent/15 data-[active=true]:text-sidebar-foreground data-[active=true]:font-semibold data-[active=true]:before:content-[''] data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1.5 data-[active=true]:before:bottom-1.5 data-[active=true]:before:w-1 data-[active=true]:before:rounded-r data-[active=true]:before:bg-sidebar-accent";

const menuItems = [
  {
    title: "Home",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "My Courses",
    url: "/dashboard/courses",
    icon: BookOpen,
  },
  {
    title: "My Writings",
    url: "/dashboard/my-writings",
    icon: PenLine,
  },
  {
    title: "Conversation Labs",
    url: "/dashboard/labs",
    icon: Users,
  },
  {
    title: "Mastery Exam",
    url: "/dashboard/exams",
    icon: Award,
  },
  {
    title: "My Progress",
    url: "/dashboard/progress",
    icon: BarChart3,
  },
];

const teacherMenuItems = [
  {
    title: "Grading queue",
    url: "/dashboard/teacher",
    icon: ClipboardList,
  },
  {
    title: "Lesson Library",
    url: "/dashboard/teacher/lessons",
    icon: Library,
  },
];

const secondaryItems = [
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
  {
    title: "Help & Support",
    url: "/dashboard/help",
    icon: HelpCircle,
  },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { locale, setLocale } = useTranslation();
  const currentPath = window.location.pathname;

  // Pull the student's CEFR level + XP for the always-visible level chip.
  // /api/user-stats is already fetched by DashboardOverview so this is a
  // free cache hit on the home page; on other pages it's one extra query
  // but very small.
  const { data: userStats } = useQuery<UserStats>({
    queryKey: ["/api/user-stats"],
    enabled: !!user,
  });
  const currentLevel = userStats?.currentLevel || user?.placementLevel || "A1";
  const xpPoints = userStats?.xpPoints ?? 0;

  const getInitials = () => {
    if (!user) return "U";
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || "U";
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 space-y-3">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer" data-testid="link-sidebar-logo">
            <div className="w-8 h-8 bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg uppercase tracking-tight text-sidebar-foreground">
              COGNI<span className="text-primary">BOOST</span>
            </span>
          </div>
        </Link>

        {/* Level chip — keeps the student aware of where they are in
            their CEFR journey at all times. Cyan dot + indigo soft bg
            mirrors the dashboard hero treatment. */}
        {user && (
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10"
            data-testid="sidebar-level-chip"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sidebar-accent flex-shrink-0" />
            <span className="text-[11px] font-bold tracking-wide text-sidebar-accent">
              {currentLevel} · {(LEVEL_LABEL[currentLevel] || "Beginner").toUpperCase()}
            </span>
            <span className="ml-auto text-[10px] text-sidebar-foreground/50">
              {xpPoints} XP
            </span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-xs uppercase tracking-widest opacity-60">
            Learning
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath === item.url || currentPath.startsWith(item.url + "/")}
                    className={ACTIVE_NAV_CLASSES}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
                      <item.icon className="w-4 h-4" />
                      <span className="font-mono">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user?.isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="font-mono text-xs uppercase tracking-widest opacity-60">
              Teacher
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {teacherMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={currentPath === item.url || currentPath.startsWith(item.url + "/")}
                      className={ACTIVE_NAV_CLASSES}
                    >
                      <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
                        <item.icon className="w-4 h-4" />
                        <span className="font-mono">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-xs uppercase tracking-widest opacity-60">
            Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath === item.url || currentPath.startsWith(item.url + "/")}
                    className={ACTIVE_NAV_CLASSES}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
                      <item.icon className="w-4 h-4" />
                      <span className="font-mono">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback
              className="text-white font-bold text-sm border-0"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, #33CBFB 100%)" }}
            >
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-sm text-sidebar-foreground truncate">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user?.email || "User"
              }
            </p>
            <p className="text-xs font-mono text-sidebar-foreground/60 truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <SidebarMenuButton
          className="w-full justify-start"
          onClick={() => setLocale(locale === "en" ? "es" : "en")}
          data-testid="button-language-toggle"
        >
          <Globe className="w-4 h-4" />
          <span className="font-mono">{locale === "en" ? "Español" : "English"}</span>
        </SidebarMenuButton>
        <SidebarMenuButton
          className="w-full justify-start text-destructive hover:text-destructive"
          onClick={() => window.location.href = "/api/logout"}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          <span className="font-mono">Sign Out</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
