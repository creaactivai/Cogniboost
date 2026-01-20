import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle, GraduationCap } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ActivatePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    setToken(tokenParam);
  }, []);

  const { data: user, isLoading: userLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const activateMutation = useMutation({
    mutationFn: async (invitationToken: string) => {
      const response = await apiRequest("POST", "/api/auth/activate", { token: invitationToken });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "¡Cuenta activada!",
        description: "Tu cuenta ha sido activada exitosamente. Bienvenido a CogniBoost.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Error de activación",
        description: error.message || "No se pudo activar tu cuenta. Por favor contacta soporte.",
        variant: "destructive",
      });
    },
  });

  const handleActivation = () => {
    if (token) {
      activateMutation.mutate(token);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Token de activación inválido</CardTitle>
            <CardDescription>
              El enlace de activación no es válido o ha expirado.
              Por favor contacta al administrador para obtener un nuevo enlace.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => setLocation("/")} data-testid="button-go-home">
              Ir al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <GraduationCap className="h-16 w-16 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl">¡Bienvenido a CogniBoost!</CardTitle>
            <CardDescription className="text-base">
              Has sido invitado a unirte a nuestra plataforma de aprendizaje de inglés.
              Para activar tu cuenta, primero necesitas iniciar sesión.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Paso 1:</strong> Haz clic en el botón para iniciar sesión
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Paso 2:</strong> Después de iniciar sesión, tu cuenta será activada automáticamente
              </p>
            </div>
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => window.location.href = `/api/auth/login?returnTo=/activate?token=${token}`}
              data-testid="button-login-activate"
            >
              Iniciar sesión para activar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-2xl">¡Ya casi está listo!</CardTitle>
          <CardDescription className="text-base">
            Hola {user.firstName || user.email}, haz clic en el botón para completar la activación de tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleActivation}
            disabled={activateMutation.isPending}
            data-testid="button-complete-activation"
          >
            {activateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Activando...
              </>
            ) : (
              "Completar activación"
            )}
          </Button>
          {activateMutation.isError && (
            <p className="text-sm text-destructive text-center">
              Hubo un error al activar tu cuenta. Por favor intenta de nuevo.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
