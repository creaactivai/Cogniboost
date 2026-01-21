import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, GraduationCap, LayoutDashboard } from "lucide-react";
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
  const [status, setStatus] = useState<string>("Procesando tu compra...");
  const [showOptions, setShowOptions] = useState(false);
  const hasRedirectedToLogin = useRef(false);
  const hasLinkedCustomer = useRef(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id");

    if (!sessionId) {
      const pendingData = localStorage.getItem("pending_stripe_customer");
      if (pendingData) {
        setSessionData(JSON.parse(pendingData));
        setIsLoading(false);
        return;
      }
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
    if (isLoading || authLoading) return;
    
    if (!isAuthenticated && sessionData && !hasRedirectedToLogin.current) {
      hasRedirectedToLogin.current = true;
      setStatus("Redirigiendo para crear tu cuenta...");
      setTimeout(() => {
        window.location.href = "/api/login?returnTo=/purchase-complete";
      }, 1500);
    }
  }, [isLoading, authLoading, isAuthenticated, sessionData]);

  useEffect(() => {
    if (isAuthenticated && user && sessionData && !isLinking && !hasLinkedCustomer.current) {
      hasLinkedCustomer.current = true;
      setIsLinking(true);
      setStatus("Vinculando tu suscripción...");
      
      fetch("/api/stripe/link-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customerId: sessionData.customerId,
          subscriptionId: sessionData.subscriptionId,
          planName: sessionData.planName,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            localStorage.removeItem("pending_stripe_customer");
            setStatus("¡Suscripción vinculada!");
            setShowOptions(true);
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
  }, [isAuthenticated, user, sessionData, isLinking]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full p-8 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <a href="/" className="text-primary hover:underline">Volver al Inicio</a>
        </Card>
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

        <p className="text-muted-foreground mb-4">
          Tu suscripción al plan <strong className="text-foreground">{sessionData?.planName || "Premium"}</strong> ha sido procesada correctamente.
        </p>

        {showOptions ? (
          <div className="space-y-4 mt-6">
            <p className="text-sm text-muted-foreground mb-4">
              ¿Cómo te gustaría comenzar?
            </p>
            
            <div className="grid gap-3">
              <Button 
                size="lg" 
                className="w-full"
                onClick={() => setLocation("/onboarding")}
                data-testid="button-start-tutorial"
              >
                <GraduationCap className="w-5 h-5 mr-2" />
                Comenzar Tutorial de Bienvenida
              </Button>
              
              <Button 
                size="lg" 
                variant="outline"
                className="w-full"
                onClick={() => setLocation("/dashboard")}
                data-testid="button-go-dashboard"
              >
                <LayoutDashboard className="w-5 h-5 mr-2" />
                Ir Directo al Dashboard
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Tu prueba gratuita de 7 días comienza hoy. Puedes cancelar en cualquier momento.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 mt-6">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <p className="text-muted-foreground">{status}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
