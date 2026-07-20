import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  DollarSign,
  Calendar,
  UserCheck,
  ChevronLeft,
  Mail,
  Target,
  UsersRound,
  GraduationCap,
  Upload,
  BarChart3,
  Award,
  ClipboardList,
  Library,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

// Grouped so 15 flat rows become scannable sections. "Planeación de Clases"
// (the teacher command center) leads Enseñanza so Coral reaches her teaching
// tools right from the admin panel — no separate login.
const menuGroups: { label: string | null; items: { title: string; url: string; icon: any }[] }[] = [
  {
    label: null,
    items: [{ title: "Panel General", url: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Enseñanza",
    items: [
      { title: "Planeación de Clases", url: "/dashboard/teacher/classes", icon: CalendarClock },
      { title: "Laboratorios", url: "/admin/labs", icon: Calendar },
      { title: "Cola de revisión", url: "/dashboard/teacher", icon: ClipboardList },
      { title: "Library", url: "/dashboard/teacher/lessons", icon: Library },
      { title: "Final Exams", url: "/admin/exams", icon: Award },
    ],
  },
  {
    label: "Estudiantes",
    items: [
      { title: "Estudiantes", url: "/admin/students", icon: Users },
      { title: "Leads", url: "/admin/leads", icon: Target },
      { title: "Onboarding y Emails", url: "/admin/onboarding", icon: Mail },
    ],
  },
  {
    label: "Contenido",
    items: [
      { title: "Cursos", url: "/admin/courses", icon: BookOpen },
      { title: "Subir Lecciones", url: "/admin/lesson-upload", icon: Upload },
    ],
  },
  {
    label: "Negocio",
    items: [
      { title: "Finanzas", url: "/admin/financials", icon: DollarSign },
      { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Equipo",
    items: [
      { title: "Instructores", url: "/admin/instructors", icon: UserCheck },
      { title: "Equipo", url: "/admin/team", icon: UsersRound },
      { title: "Anuncios (Cancelar clase)", url: "/admin/announcements", icon: Mail },
    ],
  },
];

export function AdminSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="p-4 border-b border-border">
        <Link href="/admin">
          <div className="flex items-center gap-2 cursor-pointer" data-testid="link-admin-logo">
            <div className="w-8 h-8 bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-display text-lg uppercase tracking-tight">
                COGNI<span className="text-primary">BOOST</span>
              </span>
              <p className="text-xs font-mono text-muted-foreground">
                Panel Administrativo
              </p>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      
      <SidebarContent>
        {menuGroups.map((group, gi) => (
          <SidebarGroup key={group.label ?? `g${gi}`}>
            {group.label && (
              <SidebarGroupLabel className="font-mono text-xs uppercase tracking-widest opacity-60">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  // Items OUTSIDE /admin/* (Planeación, Cola de revisión, Library
                  // live under /dashboard/teacher) need a full-page anchor so the
                  // SPA router remounts the right route reliably.
                  const crossSection = !item.url.startsWith('/admin');
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.url}
                        data-testid={`nav-admin-${item.url.replace('/admin/', '').replace('/admin', 'overview').replace('/dashboard/', '')}`}
                      >
                        {crossSection ? (
                          <a href={item.url}>
                            <item.icon className="w-4 h-4" />
                            <span className="font-mono">{item.title}</span>
                          </a>
                        ) : (
                          <Link href={item.url}>
                            <item.icon className="w-4 h-4" />
                            <span className="font-mono">{item.title}</span>
                          </Link>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t border-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2" 
          data-testid="button-logout"
          onClick={() => {
            window.location.href = "/api/logout";
          }}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="font-mono">Cerrar Sesión</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
