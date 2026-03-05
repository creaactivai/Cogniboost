import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { Loader2, Check, Star, Crown, Zap, ArrowLeft, LogOut } from "lucide-react";
import type { Subscription } from "@shared/schema";
import { ThemeToggle } from "@/components/theme-toggle";

const planDefs = [
  {
    id: "flex",
    name: "Flex",
    price: 14.99,
    priceId: "price_1SrrJiBe5iAM2felXxQFAzwZ",
    descKey: "plan.flex.desc",
    icon: Zap,
    featureKeys: [
      "plan.feature.courseLibrary",
      "plan.feature.allModules",
      "plan.feature.tracking",
      "plan.feature.certificate",
      "plan.feature.noLabs",
    ],
    popular: false,
    highlightKey: null,
  },
  {
    id: "basic",
    name: "Basic",
    price: 49.99,
    priceId: "price_1SrrdGBe5iAM2felxVv0eF4H",
    descKey: "plan.basic.desc",
    icon: Star,
    featureKeys: [
      "plan.feature.courseLibrary",
      "plan.feature.2labs",
      "plan.feature.liveClasses",
      "plan.feature.tracking",
      "plan.feature.certificate",
    ],
    popular: true,
    highlightKey: null,
  },
  {
    id: "premium",
    name: "Premium",
    price: 99.99,
    priceId: "price_1SrrgOBe5iAM2fel0N4oRbWS",
    descKey: "plan.premium.desc",
    icon: Crown,
    featureKeys: [
      "plan.feature.courseLibrary",
      "plan.feature.unlimitedLabs",
      "plan.feature.liveClasses",
      "plan.feature.priority",
      "plan.feature.prioritySupport",
      "plan.feature.linkedinCerts",
    ],
    popular: false,
    highlightKey: "plan.feature.unlimitedLabs",
  },
];

export default function ChoosePlan() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const { data: subscription, isLoading: subLoading } = useQuery<Subscription>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
  });

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/login";
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
    mutationFn: async ({ priceId, planName }: { priceId: string; planName: string }) => {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, planName }),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t("plan.errorProcessing"));
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: t("error"),
        description: error.message || t("plan.errorPayment"),
        variant: "destructive",
      });
    },
  });

  const selectFreeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/select-free", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: t("error"),
        description: error.message || t("plan.errorFree"),
        variant: "destructive",
      });
    },
  });

  const handleSelectPlan = (planId: string) => {
    const plan = planDefs.find(p => p.id === planId);
    if (!plan) return;
    setSelectedPlan(planId);
    checkoutMutation.mutate({ priceId: plan.priceId, planName: plan.name });
  };

  const handleSelectFree = () => {
    selectFreeMutation.mutate();
  };

  // Show loading while checking auth state
  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="font-mono text-muted-foreground">{t("loading")}</p>
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
          <p className="font-mono text-muted-foreground">{t("redirecting")}</p>
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
          <p className="font-mono text-muted-foreground">{t("redirecting")}</p>
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
          <p className="font-mono text-muted-foreground">{t("redirecting")}</p>
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
          <p className="font-mono text-muted-foreground">{t("redirectingDashboard")}</p>
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
              {t("plan.signOut")}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display uppercase mb-4">
            {t("plan.title")}
          </h1>
          <p className="font-mono text-muted-foreground max-w-xl mx-auto">
            {t("plan.subtitle", { name: user?.firstName || "Student" })}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {planDefs.map((plan) => (
            <Card
              key={plan.id}
              className={`relative hover-elevate ${plan.popular ? "border-primary border-2" : ""}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  {t("plan.mostPopular")}
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <div className={`w-12 h-12 mx-auto mb-4 flex items-center justify-center ${
                  plan.popular ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  <plan.icon className="w-6 h-6" />
                </div>
                <CardTitle className="font-display uppercase text-xl">{plan.name}</CardTitle>
                <p className="text-sm font-mono text-muted-foreground">{t(plan.descKey)}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <span className="text-4xl font-display">${plan.price}</span>
                  <span className="text-muted-foreground font-mono">{t("plan.perMonth")}</span>
                </div>

                <ul className="space-y-3">
                  {plan.featureKeys.map((featureKey, i) => {
                    const feature = t(featureKey);
                    const isHighlight = plan.highlightKey && featureKey === plan.highlightKey;
                    return (
                      <li key={i} className="flex items-start gap-2">
                        <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isHighlight ? "text-amber-500" : "text-success"}`} />
                        <span className={`font-mono text-sm ${isHighlight ? "font-semibold text-amber-500" : ""}`}>
                          {feature}
                        </span>
                      </li>
                    );
                  })}
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
                      {t("processing")}
                    </>
                  ) : (
                    t("plan.choose", { name: plan.name })
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center space-y-4">
          <p className="font-mono text-sm text-muted-foreground">
            {t("plan.guarantee")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="outline"
              onClick={handleSelectFree}
              disabled={selectFreeMutation.isPending}
              data-testid="button-continue-free"
            >
              {selectFreeMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {t("plan.continueFree")}
            </Button>
            <Button variant="ghost" onClick={() => setLocation("/")} data-testid="link-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("plan.backHome")}
            </Button>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {t("plan.freeIncludes")}
          </p>
        </div>
      </main>
    </div>
  );
}
