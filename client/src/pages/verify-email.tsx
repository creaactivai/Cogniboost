import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle, Mail } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error' | 'expired'>('pending');
  const [errorMessage, setErrorMessage] = useState<string>("");

  const verifyMutation = useMutation({
    mutationFn: async (verificationToken: string) => {
      const response = await apiRequest("POST", "/api/auth/verify-email", { 
        token: verificationToken,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setVerificationStatus('success');
      toast({
        title: data.alreadyVerified ? "Correo ya verificado" : "¡Correo verificado!",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: async (error: any) => {
      try {
        const errorData = error.response ? await error.response.json() : { error: error.message };
        
        if (errorData.error?.includes("expirado")) {
          setVerificationStatus('expired');
        } else {
          setVerificationStatus('error');
        }
        setErrorMessage(errorData.error || "Error desconocido");
        
        toast({
          title: "Error de verificación",
          description: errorData.error || "No se pudo verificar tu correo.",
          variant: "destructive",
        });
      } catch {
        setVerificationStatus('error');
        setErrorMessage(error.message || "Error desconocido");
        toast({
          title: "Error de verificación",
          description: error.message || "No se pudo verificar tu correo.",
          variant: "destructive",
        });
      }
    },
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    setToken(tokenParam);
    
    if (tokenParam) {
      verifyMutation.mutate(tokenParam);
    }
  }, []);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Enlace inválido</CardTitle>
            <CardDescription>
              El enlace de verificación no es válido.
              Por favor usa el enlace que recibiste en tu correo electrónico.
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

  if (verifyMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <CardTitle>Verificando tu correo...</CardTitle>
            <CardDescription>
              Por favor espera mientras verificamos tu correo electrónico.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (verificationStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">¡Correo verificado!</CardTitle>
            <CardDescription className="text-base">
              Tu correo electrónico ha sido verificado exitosamente.
              Ahora puedes disfrutar de todas las funcionalidades de CogniBoost.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 justify-center">
            <Button onClick={() => setLocation("/dashboard")} className="w-full" data-testid="button-go-dashboard">
              Ir al Dashboard
            </Button>
            <Button variant="outline" onClick={() => setLocation("/")} className="w-full" data-testid="button-go-home">
              Ir al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationStatus === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Mail className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Enlace expirado</CardTitle>
            <CardDescription className="text-base">
              El enlace de verificación ha expirado.
              Por favor inicia sesión y solicita un nuevo enlace de verificación.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 justify-center">
            <Button onClick={() => setLocation("/dashboard")} className="w-full" data-testid="button-go-dashboard">
              Ir al Dashboard
            </Button>
            <Button variant="outline" onClick={() => setLocation("/")} className="w-full" data-testid="button-go-home">
              Ir al inicio
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
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <CardTitle>Error de verificación</CardTitle>
          <CardDescription>
            {errorMessage || "No se pudo verificar tu correo electrónico."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 justify-center">
          <Button onClick={() => setLocation("/dashboard")} className="w-full" data-testid="button-go-dashboard">
            Ir al Dashboard
          </Button>
          <Button variant="outline" onClick={() => setLocation("/")} className="w-full" data-testid="button-go-home">
            Ir al inicio
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
