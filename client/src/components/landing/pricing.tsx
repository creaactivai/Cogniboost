import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Sparkles, Gift, Zap, Star, Crown, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

const plans = [
  {
    name: "Gratis",
    tier: "free",
    price: "$0",
    period: "para siempre",
    description: "Perfecto para explorar",
    icon: Gift,
    iconColor: "text-[hsl(174_58%_56%)]",
    iconBg: "bg-[hsl(174_58%_56%/0.15)]",
    features: [
      { text: "3 primeras lecciones del Módulo 1", included: true },
      { text: "1 Examen de nivel", included: true },
      { text: "1 Sesión de clase en vivo de prueba", included: true },
      { text: "Seguimiento básico de progreso", included: true },
      { text: "Biblioteca completa de cursos", included: false },
      { text: "Conversation Labs", included: false },
      { text: "Certificados", included: false },
    ],
    cta: "Comenzar Gratis",
    variant: "outline" as const,
    stripePriceId: null,
  },
  {
    name: "Flex",
    tier: "flex",
    price: "$14.99",
    period: "/mes",
    description: "Para aprendizaje a tu ritmo",
    icon: Zap,
    iconColor: "text-orange-500",
    iconBg: "bg-orange-500/15",
    trial: "Prueba 7 días gratis",
    features: [
      { text: "Biblioteca completa de cursos", included: true },
      { text: "Todos los módulos y lecciones", included: true },
      { text: "Seguimiento avanzado y analíticas", included: true },
      { text: "Certificado descargable", included: true },
      { text: "Soporte por email", included: true },
      { text: "Conversation Labs", included: false },
      { text: "Clases en vivo grupales", included: false },
    ],
    cta: "Prueba 7 Días Gratis",
    variant: "default" as const,
    stripePriceId: import.meta.env.VITE_STRIPE_PRICE_FLEX || null,
  },
  {
    name: "Básico",
    tier: "basic",
    price: "$49.99",
    period: "/mes",
    description: "La opción más popular",
    icon: Star,
    iconColor: "text-primary",
    iconBg: "bg-primary/15",
    popular: true,
    trial: "Prueba 7 días gratis",
    features: [
      { text: "Biblioteca completa de cursos", included: true },
      { text: "2 Conversation Labs por semana", included: true },
      { text: "Clases en vivo por nivel (A1-C2)", included: true },
      { text: "Seguimiento avanzado y analíticas", included: true },
      { text: "Certificado descargable", included: true },
      { text: "Soporte por email", included: true },
      { text: "Labs ilimitados", included: false },
    ],
    cta: "Prueba 7 Días Gratis",
    variant: "default" as const,
    stripePriceId: import.meta.env.VITE_STRIPE_PRICE_STANDARD || null,
  },
  {
    name: "Premium",
    tier: "premium",
    price: "$99.99",
    period: "/mes",
    description: "Para estudiantes comprometidos",
    icon: Crown,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/15",
    accent: true,
    trial: "Prueba 7 días gratis",
    features: [
      { text: "Biblioteca completa de cursos", included: true },
      { text: "Conversation Labs ILIMITADOS", included: true, highlight: true },
      { text: "Clases en vivo por nivel (A1-C2)", included: true },
      { text: "Prioridad de agenda en labs", included: true },
      { text: "Soporte prioritario", included: true },
      { text: "Seguimiento avanzado y analíticas", included: true },
      { text: "Certificados para LinkedIn", included: true },
      { text: "Acceso anticipado a nuevos cursos", included: true },
    ],
    cta: "Prueba 7 Días Gratis",
    variant: "default" as const,
    stripePriceId: import.meta.env.VITE_STRIPE_PRICE_PREMIUM || null,
  },
];

function PricingCard({ plan, onCheckout }: { plan: typeof plans[0]; onCheckout: (priceId: string, planName: string) => void }) {
  const IconComponent = plan.icon;

  const handleClick = () => {
    if (plan.stripePriceId) {
      onCheckout(plan.stripePriceId, plan.name);
    } else {
      // Free plan - redirect to signup
      window.location.href = "/api/login";
    }
  };
  
  return (
    <div 
      className={`
        relative p-6 border hover-elevate transition-colors duration-300 rounded flex flex-col h-full
        ${plan.popular ? "border-primary" : "border-border"} 
        ${plan.accent ? "bg-foreground text-background" : "bg-card"}
      `}
      data-testid={`card-plan-${plan.name.toLowerCase()}`}
    >
      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs uppercase tracking-wider flex items-center gap-1 rounded">
          <Sparkles className="w-3 h-3" />
          Popular
        </div>
      )}

      {/* Trial badge */}
      {plan.trial && !plan.popular && (
        <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 text-xs uppercase tracking-wider rounded ${plan.accent ? "bg-amber-500 text-black" : "bg-muted text-muted-foreground"}`}>
          {plan.trial}
        </div>
      )}

      {/* Plan icon */}
      <div className={`w-14 h-14 flex items-center justify-center rounded mb-4 ${plan.accent ? "bg-background/10" : plan.iconBg}`}>
        <IconComponent className={`w-7 h-7 ${plan.accent ? "text-background" : plan.iconColor}`} />
      </div>

      {/* Plan header */}
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-wider opacity-60 mb-1" data-testid={`text-plan-name-${plan.name.toLowerCase()}`}>{plan.name}</p>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-4xl font-bold" data-testid={`text-plan-price-${plan.name.toLowerCase()}`}>{plan.price}</span>
          <span className="text-sm opacity-60">{plan.period}</span>
        </div>
        <p className="text-sm opacity-60">{plan.description}</p>
      </div>

      {/* Features */}
      <ul className="space-y-2.5 mb-6 flex-1">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2.5">
            {feature.included ? (
              <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.accent ? "text-amber-400" : "text-primary"}`} />
            ) : (
              <X className="w-4 h-4 flex-shrink-0 opacity-30 mt-0.5" />
            )}
            <span className={`text-sm leading-tight ${!feature.included ? "opacity-40" : ""} ${'highlight' in feature && feature.highlight ? "font-semibold text-amber-400" : ""}`}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Button 
        className={`w-full ${plan.name === "Gratis" ? "bg-[#4ed0c3] text-foreground" : ""}`}
        variant={plan.variant}
        onClick={handleClick}
        data-testid={`button-plan-${plan.name.toLowerCase()}`}
      >
        {plan.cta}
      </Button>
    </div>
  );
}

export function Pricing() {
  const { toast } = useToast();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(2);
  const [isMobile, setIsMobile] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const proceedToStripeCheckout = async (priceId: string, planName: string) => {
    setIsCheckingOut(true);
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, planName }),
        credentials: "include",
      });
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "No checkout URL received");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Error al procesar",
        description: "Hubo un problema al iniciar el pago. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleCheckout = async (priceId: string, planName: string) => {
    // Go directly to Stripe checkout - Stripe will collect email
    await proceedToStripeCheckout(priceId, planName);
  };

  useEffect(() => {
    if (!api) return;

    api.scrollTo(2);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const scrollTo = (index: number) => {
    api?.scrollTo(index);
  };

  return (
    <section className="py-32 bg-background relative overflow-hidden" id="pricing">
      {/* Floating decorative elements */}
      <div className="absolute top-16 left-20 w-24 h-24 border-4 border-primary/30 rounded float-animation" style={{ animationDelay: "1s" }} />
      <div className="absolute bottom-24 right-10 w-20 h-20 border-4 border-[hsl(174_58%_56%/0.4)] rounded float-animation" style={{ animationDelay: "3s" }} />
      <div className="absolute top-1/2 left-8 w-16 h-16 border-4 border-primary/20 rounded float-animation" style={{ animationDelay: "0s" }} />
      <div className="absolute bottom-1/3 right-24 w-12 h-12 border-4 border-[hsl(174_58%_56%/0.25)] rounded float-animation" style={{ animationDelay: "2s" }} />
      <div className="container mx-auto px-6 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-sm text-primary uppercase tracking-widest mb-4">Precios</p>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Planes <span className="text-[hsl(174_58%_56%)]">Flexibles</span>
            <br />
            para Tu Crecimiento
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Elige el plan que se adapte a tus objetivos profesionales. Sube, baja o cancela en cualquier momento.
          </p>
        </div>

        {/* Mobile: Carousel, Desktop: Grid */}
        {isMobile ? (
          <>
            {/* Mobile carousel navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => api?.scrollPrev()}
                disabled={current === 0}
                className="disabled:opacity-30"
                data-testid="button-pricing-prev"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex gap-2">
                {plans.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => scrollTo(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      index === current ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                    data-testid={`button-pricing-dot-${index}`}
                    aria-label={`Go to plan ${index + 1}`}
                  />
                ))}
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => api?.scrollNext()}
                disabled={current === plans.length - 1}
                className="disabled:opacity-30"
                data-testid="button-pricing-next"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            <Carousel
              setApi={setApi}
              opts={{
                align: "center",
                loop: false,
              }}
              className="w-full overflow-visible"
              data-testid="pricing-carousel"
            >
              <CarouselContent className="-ml-4 pt-6 pb-2">
                {plans.map((plan) => (
                  <CarouselItem key={plan.name} className="pl-4 basis-[85%]">
                    <PricingCard plan={plan} onCheckout={handleCheckout} />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="pricing-grid">
            {plans.map((plan) => (
              <PricingCard key={plan.name} plan={plan} onCheckout={handleCheckout} />
            ))}
          </div>
        )}

        {/* Trust indicators */}
        <div className="flex flex-wrap justify-center gap-8 mt-16 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            <span>Clase Gratis</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            <span>Cancela cuando quieras</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            <span>7 días de prueba</span>
          </div>
        </div>
      </div>
    </section>
  );
}
