import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Loader2 } from "lucide-react";
import logoImage from "@assets/Frame_2_1768763364518.png";
import { useAuth } from "@/hooks/use-auth";

interface SessionData {
  customerEmail: string;
  customerId: string;
  subscriptionId: string;
  planName: string;
}

export default function PurchaseComplete() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id");

    if (!sessionId) {
      setError("No se encontró información de la compra");
      setIsLoading(false);
      return;
    }

    fetch(`/api/stripe/checkout-session/${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setSessionData(data);
          localStorage.setItem("pending_stripe_customer", JSON.stringify(data));
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching session:", err);
        setError("Error al obtener información de la compra");
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (isAuthenticated && user && sessionData && !isLinking) {
      setIsLinking(true);
      fetch("/api/stripe/link-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customerId: sessionData.customerId,
          subscriptionId: sessionData.subscriptionId,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            localStorage.removeItem("pending_stripe_customer");
            setLocation("/dashboard?payment=success");
          } else {
            setError("Error al vincular la suscripción");
          }
        })
        .catch((err) => {
          console.error("Error linking customer:", err);
          setError("Error al vincular la suscripción");
        })
        .finally(() => setIsLinking(false));
    }
  }, [isAuthenticated, user, sessionData, isLinking, setLocation]);

  const handleLogin = () => {
    window.location.href = "/api/auth/login";
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full p-8 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => setLocation("/")}>Volver al Inicio</Button>
        </Card>
      </div>
    );
  }

  if (isLinking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Vinculando tu suscripción...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-6">
      <Card className="max-w-lg w-full p-8 text-center">
        <a href="/" className="inline-block mb-6">
          <img src={logoImage} alt="CogniBoost" className="h-10 mx-auto" />
        </a>

        <div className="w-16 h-16 bg-[hsl(174_58%_56%/0.15)] rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-[hsl(174_58%_56%)]" />
        </div>

        <h1 className="text-2xl font-bold mb-2" data-testid="text-purchase-title">
          ¡Compra Exitosa!
        </h1>

        <p className="text-muted-foreground mb-6">
          Tu suscripción al plan <strong className="text-foreground">{sessionData?.planName || "Premium"}</strong> ha sido procesada correctamente.
        </p>

        {sessionData?.customerEmail && (
          <p className="text-sm text-muted-foreground mb-6">
            Confirmación enviada a: <strong>{sessionData.customerEmail}</strong>
          </p>
        )}

        <div className="bg-muted p-4 rounded mb-6">
          <p className="text-sm font-medium mb-2">Próximo paso:</p>
          <p className="text-sm text-muted-foreground">
            Crea tu cuenta o inicia sesión para acceder a tu suscripción y comenzar a aprender.
          </p>
        </div>

        <Button 
          size="lg" 
          className="w-full" 
          onClick={handleLogin}
          data-testid="button-create-account"
        >
          Crear Cuenta / Iniciar Sesión
        </Button>

        <p className="text-xs text-muted-foreground mt-4">
          Tu prueba gratuita de 7 días comienza hoy. Puedes cancelar en cualquier momento.
        </p>
      </Card>
    </div>
  );
}
