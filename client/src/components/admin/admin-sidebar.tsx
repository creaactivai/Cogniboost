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
  Target
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
];

export function AdminSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#33CBFB] flex items-center justify-center">
            <span className="text-black font-black text-sm" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>C</span>
          </div>
          <div>
            <h1 className="font-black text-lg" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
              CogniBoost
            </h1>
            <p className="text-xs text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              Panel Administrativo
            </p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel style={{ fontFamily: 'JetBrains Mono, monospace' }}>
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
                      <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t border-border">
        <Link href="/">
          <Button variant="ghost" className="w-full justify-start gap-2" data-testid="button-back-to-site">
            <ChevronLeft className="w-4 h-4" />
            <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>Volver al Sitio</span>
          </Button>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
