import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, Star, Crown, Zap, ArrowLeft, LogOut } from "lucide-react";
import type { Subscription } from "@shared/schema";
import { ThemeToggle } from "@/components/theme-toggle";

const plans = [
  {
    id: "flex",
    name: "Flex",
    price: 14.99,
    priceId: "price_flex",
    description: "Para aprendizaje a tu ritmo",
    icon: Zap,
    features: [
      "Biblioteca completa de cursos",
      "Todos los módulos y lecciones",
      "Seguimiento avanzado",
      "Certificado descargable",
      "Sin acceso a Conversation Labs",
    ],
    popular: false,
    highlight: null,
  },
  {
    id: "basic",
    name: "Básico",
    price: 49.99,
    priceId: "price_basic",
    description: "La opción más popular",
    icon: Star,
    features: [
      "Biblioteca completa de cursos",
      "2 Conversation Labs por semana",
      "Clases en vivo por nivel (A1-C2)",
      "Seguimiento avanzado",
      "Certificado descargable",
    ],
    popular: true,
    highlight: null,
  },
  {
    id: "premium",
    name: "Premium",
    price: 99.99,
    priceId: "price_premium",
    description: "Para resultados acelerados",
    icon: Crown,
    features: [
      "Biblioteca completa de cursos",
      "Conversation Labs ILIMITADOS",
      "Clases en vivo por nivel (A1-C2)",
      "Prioridad de agenda en labs",
      "Soporte prioritario",
      "Certificados para LinkedIn",
    ],
    popular: false,
    highlight: "Conversation Labs ILIMITADOS",
  },
];

export default function ChoosePlan() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const { data: subscription, isLoading: subLoading } = useQuery<Subscription>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
  });

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/api/login";
    }
  }, [authLoading, user]);

  // Redirect admins to admin panel
  useEffect(() => {
    if (!authLoading && user?.isAdmin) {
      setLocation("/admin");
    }
  }, [authLoading, user, setLocation]);

  // Redirect users who haven't completed onboarding
  useEffect(() => {
    if (!authLoading && user && !user.onboardingCompleted) {
      setLocation("/onboarding");
    }
  }, [authLoading, user, setLocation]);

  const checkoutMutation = useMutation({
    mutationFn: async (tier: string) => {
      const response = await apiRequest("POST", "/api/stripe/checkout", { tier });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo iniciar el proceso de pago",
        variant: "destructive",
      });
    },
  });

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    checkoutMutation.mutate(planId);
  };

  // Show loading while checking auth state
  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="font-mono text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Don't render content if user is not authenticated (redirect is in useEffect)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="font-mono text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  // Don't render content for admins (redirect is in useEffect)
  if (user.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="font-mono text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  // Don't render content if onboarding not complete (redirect is in useEffect)
  if (!user.onboardingCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="font-mono text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  // If user already has a paid subscription, redirect to dashboard
  if (subscription && subscription.tier !== "free") {
    setLocation("/dashboard");
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="font-mono text-muted-foreground">Redirigiendo al dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">C</span>
            </div>
            <span className="font-display text-xl uppercase tracking-tight">
              <span className="text-primary">Cogni</span>Boost
            </span>
          </a>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display uppercase mb-4">
            Elige tu Plan
          </h1>
          <p className="font-mono text-muted-foreground max-w-xl mx-auto">
            ¡Hola, {user?.firstName || "Estudiante"}! Para acceder a todo el contenido de CogniBoost,
            selecciona el plan que mejor se adapte a tus necesidades.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative hover-elevate ${plan.popular ? "border-primary border-2" : ""}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  Más Popular
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <div className={`w-12 h-12 mx-auto mb-4 flex items-center justify-center ${
                  plan.popular ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  <plan.icon className="w-6 h-6" />
                </div>
                <CardTitle className="font-display uppercase text-xl">{plan.name}</CardTitle>
                <p className="text-sm font-mono text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <span className="text-4xl font-display">${plan.price}</span>
                  <span className="text-muted-foreground font-mono">/mes</span>
                </div>
                
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${plan.highlight === feature ? "text-amber-500" : "text-success"}`} />
                      <span className={`font-mono text-sm ${plan.highlight === feature ? "font-semibold text-amber-500" : ""}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${plan.popular ? "" : "variant-outline"}`}
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={checkoutMutation.isPending && selectedPlan === plan.id}
                  data-testid={`button-select-${plan.id}`}
                >
                  {checkoutMutation.isPending && selectedPlan === plan.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Procesando...
                    </>
                  ) : (
                    `Elegir ${plan.name}`
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <p className="font-mono text-sm text-muted-foreground mb-4">
            Todos los planes incluyen garantía de satisfacción de 7 días
          </p>
          <Button variant="ghost" onClick={() => setLocation("/")} data-testid="link-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al inicio
          </Button>
        </div>
      </main>
    </div>
  );
}
