import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, AlertCircle, GraduationCap, Calendar, ShieldCheck } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ActivatePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [requiresBirthDate, setRequiresBirthDate] = useState(false);
  const [birthDate, setBirthDate] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    setToken(tokenParam);
  }, []);

  const { data: user, isLoading: userLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const activateMutation = useMutation({
    mutationFn: async ({ invitationToken, birthDateStr }: { invitationToken: string; birthDateStr?: string }) => {
      const response = await apiRequest("POST", "/api/auth/activate", { 
        token: invitationToken,
        birthDate: birthDateStr,
      });
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
    onError: async (error: any) => {
      try {
        const errorData = error.response ? await error.response.json() : { error: error.message };
        
        if (errorData.requiresBirthDateVerification) {
          setRequiresBirthDate(true);
          toast({
            title: "Verificación requerida",
            description: "Por favor ingresa tu fecha de nacimiento para verificar tu identidad.",
          });
          return;
        }
        
        toast({
          title: "Error de activación",
          description: errorData.error || "No se pudo activar tu cuenta. Por favor contacta soporte.",
          variant: "destructive",
        });
      } catch {
        toast({
          title: "Error de activación",
          description: error.message || "No se pudo activar tu cuenta.",
          variant: "destructive",
        });
      }
    },
  });

  const handleActivation = () => {
    if (token) {
      activateMutation.mutate({ 
        invitationToken: token, 
        birthDateStr: birthDate || undefined 
      });
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
                <strong>Paso 1:</strong> Inicia sesión con Google, Apple, o email
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Paso 2:</strong> Verifica tu identidad para activar tu cuenta
              </p>
            </div>
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => window.location.href = `/api/login?returnTo=/activate?token=${token}`}
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
          {requiresBirthDate ? (
            <ShieldCheck className="h-16 w-16 text-primary mx-auto mb-4" />
          ) : (
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          )}
          <CardTitle className="text-2xl">
            {requiresBirthDate ? "Verificación de identidad" : "¡Ya casi está listo!"}
          </CardTitle>
          <CardDescription className="text-base">
            {requiresBirthDate 
              ? "Por seguridad, confirma tu fecha de nacimiento para completar la activación."
              : `Hola ${user.firstName || user.email}, haz clic en el botón para completar la activación de tu cuenta.`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {requiresBirthDate && (
            <div className="space-y-2">
              <Label htmlFor="birthDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de nacimiento
              </Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                data-testid="input-birthdate"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Ingresa la fecha de nacimiento que proporcionaste al registrarte.
              </p>
            </div>
          )}
          
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleActivation}
            disabled={activateMutation.isPending || (requiresBirthDate && !birthDate)}
            data-testid="button-complete-activation"
          >
            {activateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              requiresBirthDate ? "Verificar y activar" : "Completar activación"
            )}
          </Button>
          
          {activateMutation.isError && !requiresBirthDate && (
            <p className="text-sm text-destructive text-center">
              Hubo un error al activar tu cuenta. Por favor intenta de nuevo.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
