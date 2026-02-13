import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, LogIn } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function AcceptInvitation() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "need_login">("loading");
  const [message, setMessage] = useState("");
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Token de invitación no encontrado");
      return;
    }

    if (authLoading) return;

    if (!user) {
      setStatus("need_login");
      setMessage("Por favor inicia sesión para aceptar la invitación");
      return;
    }

    const acceptInvitation = async () => {
      try {
        const response = await apiRequest("POST", "/api/accept-invitation", { token });
        const data = await response.json();
        
        if (response.ok) {
          setStatus("success");
          setMessage(data.message);
          setRole(data.role);
        } else {
          setStatus("error");
          setMessage(data.error || "Error al aceptar la invitación");
        }
      } catch (error) {
        setStatus("error");
        setMessage("Error de conexión. Por favor intenta de nuevo.");
      }
    };

    acceptInvitation();
  }, [user, authLoading]);

  const handleLogin = () => {
    const currentUrl = window.location.href;
    window.location.href = `/login`;
  };

  const handleGoToDashboard = () => {
    if (role === "admin") {
      setLocation("/admin");
    } else {
      // Instructors and other roles go to main dashboard
      setLocation("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Invitación al Equipo
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
              <p className="text-muted-foreground">Procesando invitación...</p>
            </>
          )}

          {status === "need_login" && (
            <>
              <LogIn className="w-12 h-12 mx-auto text-primary" />
              <p className="text-muted-foreground">{message}</p>
              <Button onClick={handleLogin} className="w-full" data-testid="button-login">
                Iniciar Sesión
              </Button>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
              <p className="text-lg font-medium text-foreground">{message}</p>
              <Button onClick={handleGoToDashboard} className="w-full" data-testid="button-go-dashboard">
                Ir al Panel
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-12 h-12 mx-auto text-destructive" />
              <p className="text-destructive">{message}</p>
              <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-go-home">
                Volver al Inicio
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
