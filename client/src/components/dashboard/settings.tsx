import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Bell, 
  Globe, 
  CreditCard, 
  Shield,
  Camera,
  Check
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function Settings() {
  const { user } = useAuth();

  const getInitials = () => {
    if (!user) return "U";
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || "U";
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display uppercase mb-2">Configuración de Cuenta</h1>
        <p className="font-mono text-muted-foreground">
          Administra tus preferencias y suscripción
        </p>
      </div>

      {/* Profile section */}
      <Card className="p-6 border-border">
        <div className="flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-display uppercase">Perfil</h2>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-mono">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <Button 
                size="icon" 
                variant="secondary" 
                className="absolute -bottom-2 -right-2 w-8 h-8"
                data-testid="button-change-avatar"
              >
                <Camera className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs font-mono text-muted-foreground">JPG, PNG. Máx 2MB</p>
          </div>

          {/* Form fields */}
          <div className="flex-1 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="font-mono text-sm">Nombre</Label>
                <Input 
                  id="firstName" 
                  defaultValue={user?.firstName || ""} 
                  className="font-mono"
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="font-mono text-sm">Apellido</Label>
                <Input 
                  id="lastName" 
                  defaultValue={user?.lastName || ""} 
                  className="font-mono"
                  data-testid="input-last-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="font-mono text-sm">Correo Electrónico</Label>
              <Input 
                id="email" 
                type="email" 
                defaultValue={user?.email || ""} 
                className="font-mono"
                disabled
                data-testid="input-email"
              />
              <p className="text-xs font-mono text-muted-foreground">
                El correo se administra desde tu cuenta de Replit
              </p>
            </div>
            <Button className="font-mono uppercase tracking-wider" data-testid="button-save-profile">
              Guardar Cambios
            </Button>
          </div>
        </div>
      </Card>

      {/* Preferences */}
      <Card className="p-6 border-border">
        <div className="flex items-center gap-2 mb-6">
          <Globe className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-display uppercase">Preferencias</h2>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-mono font-medium">Idioma de la Interfaz</p>
              <p className="text-sm font-mono text-muted-foreground">
                Elige tu idioma preferido para la plataforma
              </p>
            </div>
            <Select defaultValue="es">
              <SelectTrigger className="w-48 font-mono" data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">Inglés</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="pt">Portugués</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-mono font-medium">Zona Horaria</p>
              <p className="text-sm font-mono text-muted-foreground">
                Configura tu zona horaria para la programación de labs
              </p>
            </div>
            <Select defaultValue="est">
              <SelectTrigger className="w-48 font-mono" data-testid="select-timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="est">EST (UTC-5)</SelectItem>
                <SelectItem value="cst">CST (UTC-6)</SelectItem>
                <SelectItem value="mst">MST (UTC-7)</SelectItem>
                <SelectItem value="pst">PST (UTC-8)</SelectItem>
                <SelectItem value="brt">BRT (UTC-3)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card className="p-6 border-border">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-display uppercase">Notificaciones</h2>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono font-medium">Recordatorios de Labs</p>
              <p className="text-sm font-mono text-muted-foreground">
                Recibe recordatorios antes de tus labs programados
              </p>
            </div>
            <Switch defaultChecked data-testid="switch-lab-reminders" />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono font-medium">Actualizaciones de Cursos</p>
              <p className="text-sm font-mono text-muted-foreground">
                Recibe notificaciones sobre nuevas lecciones y cursos
              </p>
            </div>
            <Switch defaultChecked data-testid="switch-course-updates" />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono font-medium">Reportes de Progreso</p>
              <p className="text-sm font-mono text-muted-foreground">
                Resumen semanal de tu progreso de aprendizaje
              </p>
            </div>
            <Switch defaultChecked data-testid="switch-progress-reports" />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono font-medium">Correos de Marketing</p>
              <p className="text-sm font-mono text-muted-foreground">
                Promociones, consejos y recursos de aprendizaje
              </p>
            </div>
            <Switch data-testid="switch-marketing" />
          </div>
        </div>
      </Card>

      {/* Subscription */}
      <Card className="p-6 border-border">
        <div className="flex items-center gap-2 mb-6">
          <CreditCard className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-display uppercase">Suscripción</h2>
        </div>

        <div className="p-4 border border-primary/30 bg-primary/5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-mono font-semibold">Plan Estándar</p>
                <Badge className="bg-primary text-primary-foreground font-mono text-xs">ACTIVO</Badge>
              </div>
              <p className="text-sm font-mono text-muted-foreground">
                $29/mes • Se renueva el 15 de Feb, 2025
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="font-mono" data-testid="button-manage-subscription">
                Administrar
              </Button>
              <Button className="bg-accent text-accent-foreground font-mono" data-testid="button-upgrade">
                Subir a Premium
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
            <Check className="w-4 h-4 text-primary" />
            <span>Acceso a toda la biblioteca de cursos</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
            <Check className="w-4 h-4 text-primary" />
            <span>4 laboratorios de conversación por mes</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
            <Check className="w-4 h-4 text-primary" />
            <span>Certificados descargables</span>
          </div>
        </div>
      </Card>

      {/* Privacy */}
      <Card className="p-6 border-border">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-display uppercase">Privacidad y Seguridad</h2>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono font-medium">Visibilidad del Perfil</p>
              <p className="text-sm font-mono text-muted-foreground">
                Permitir que otros estudiantes vean tu perfil
              </p>
            </div>
            <Switch defaultChecked data-testid="switch-profile-visibility" />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono font-medium">Mostrar Progreso</p>
              <p className="text-sm font-mono text-muted-foreground">
                Mostrar tu nivel y logros públicamente
              </p>
            </div>
            <Switch data-testid="switch-show-progress" />
          </div>

          <Separator />

          <div>
            <p className="font-mono font-medium mb-2">Eliminar Cuenta</p>
            <p className="text-sm font-mono text-muted-foreground mb-4">
              Eliminar permanentemente tu cuenta y todos los datos asociados
            </p>
            <Button variant="destructive" className="font-mono" data-testid="button-delete-account">
              Eliminar Cuenta
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
