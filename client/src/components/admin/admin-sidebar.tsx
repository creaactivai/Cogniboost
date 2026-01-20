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
  GraduationCap
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

const menuItems = [
  {
    title: "Panel General",
    url: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Cursos",
    url: "/admin/courses",
    icon: BookOpen,
  },
  {
    title: "Estudiantes",
    url: "/admin/students",
    icon: Users,
  },
  {
    title: "Finanzas",
    url: "/admin/financials",
    icon: DollarSign,
  },
  {
    title: "Laboratorios",
    url: "/admin/labs",
    icon: Calendar,
  },
  {
    title: "Instructores",
    url: "/admin/instructors",
    icon: UserCheck,
  },
  {
    title: "Onboarding y Emails",
    url: "/admin/onboarding",
    icon: Mail,
  },
  {
    title: "Leads",
    url: "/admin/leads",
    icon: Target,
  },
  {
    title: "Equipo",
    url: "/admin/team",
    icon: UsersRound,
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
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-xs uppercase tracking-widest opacity-60">
            Gestión
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-admin-${item.url.replace('/admin/', '').replace('/admin', 'overview')}`}
                  >
                    <Link href={item.url}>
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
      
      <SidebarFooter className="p-4 border-t border-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2" 
          data-testid="button-logout"
          onClick={async () => {
            await fetch("/__replit/auth/logout", { method: "GET" });
            window.location.href = "/";
          }}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="font-mono">Cerrar Sesión</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
