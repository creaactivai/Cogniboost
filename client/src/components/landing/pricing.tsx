import { Button } from "@/components/ui/button";
import { Check, X, Sparkles } from "lucide-react";

const plans = [
  {
    name: "GRATIS",
    price: "$0",
    period: "para siempre",
    description: "Perfecto para explorar",
    features: [
      { text: "5 lecciones introductorias", included: true },
      { text: "1 laboratorio de prueba", included: true },
      { text: "Seguimiento básico de progreso", included: true },
      { text: "Biblioteca completa de cursos", included: false },
      { text: "Labs en vivo mensuales", included: false },
      { text: "Sesiones 1 a 1", included: false },
      { text: "Certificados", included: false },
      { text: "Soporte prioritario", included: false },
    ],
    cta: "Comenzar Gratis",
    variant: "outline" as const,
  },
  {
    name: "ESTÁNDAR",
    price: "$29",
    period: "/mes",
    description: "La opción más popular",
    popular: true,
    features: [
      { text: "Biblioteca completa (100+ cursos)", included: true },
      { text: "4 laboratorios de conversación/mes", included: true },
      { text: "Seguimiento avanzado de progreso", included: true },
      { text: "Certificados descargables", included: true },
      { text: "Soporte por email", included: true },
      { text: "Sesiones 1 a 1", included: false },
      { text: "Soporte prioritario", included: false },
      { text: "Ruta de aprendizaje personalizada", included: false },
    ],
    cta: "Prueba 7 Días Gratis",
    variant: "default" as const,
  },
  {
    name: "PREMIUM",
    price: "$79",
    period: "/mes",
    description: "Para estudiantes serios",
    features: [
      { text: "Todo lo del plan Estándar", included: true },
      { text: "8 laboratorios de conversación/mes", included: true },
      { text: "2 sesiones 1 a 1/mes", included: true },
      { text: "Soporte prioritario", included: true },
      { text: "Ruta de aprendizaje personalizada", included: true },
      { text: "Grabaciones de labs (30 días)", included: true },
      { text: "Certificación para LinkedIn", included: true },
      { text: "Acceso anticipado a funciones", included: true },
    ],
    cta: "Prueba 7 Días Gratis",
    variant: "default" as const,
    accent: true,
  },
];

export function Pricing() {
  return (
    <section className="py-32 bg-background relative overflow-hidden" id="pricing">
      {/* Floating decorative elements */}
      <div className="absolute top-16 left-20 w-24 h-24 border-4 border-primary/30 float-animation" style={{ animationDelay: "1s" }} />
      <div className="absolute bottom-24 right-10 w-20 h-20 border-4 border-accent/40 float-animation" style={{ animationDelay: "3s" }} />
      <div className="absolute top-1/2 left-8 w-16 h-16 border-4 border-primary/20 float-animation" style={{ animationDelay: "0s" }} />
      <div className="absolute bottom-1/3 right-24 w-12 h-12 border-4 border-accent/25 float-animation" style={{ animationDelay: "2s" }} />
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Section header */}
        <div className="text-center mb-20">
          <p className="text-sm font-mono text-primary uppercase tracking-widest mb-4">PRECIOS</p>
          <h2 className="text-4xl md:text-6xl font-display uppercase mb-6">
            PLANES <span className="text-accent">FLEXIBLES</span>
            <br />
            PARA CADA ESTUDIANTE
          </h2>
          <p className="text-lg text-muted-foreground font-mono max-w-2xl mx-auto">
            Elige el plan que se adapte a tus metas de aprendizaje. Sube, baja o cancela en cualquier momento.
          </p>
        </div>

        {/* Pricing grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div 
              key={plan.name}
              className={`relative p-8 border hover-elevate transition-colors duration-300 rounded-lg ${plan.popular ? "border-primary" : "border-border"} ${plan.accent ? "bg-foreground text-background" : "bg-card"}`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-mono uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  POPULAR
                </div>
              )}

              {/* Plan header */}
              <div className="mb-8">
                <p className="text-sm font-mono uppercase tracking-wider opacity-60 mb-2">{plan.name}</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-5xl font-display">{plan.price}</span>
                  <span className="text-sm font-mono opacity-60">{plan.period}</span>
                </div>
                <p className="text-sm font-mono opacity-60">{plan.description}</p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className={`w-4 h-4 flex-shrink-0 ${plan.accent ? "text-primary" : "text-primary"}`} />
                    ) : (
                      <X className="w-4 h-4 flex-shrink-0 opacity-30" />
                    )}
                    <span className={`text-sm font-mono ${!feature.included && "opacity-40"}`}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button 
                className={`w-full font-mono uppercase tracking-wider ${plan.accent ? "bg-accent text-accent-foreground" : plan.variant === "default" ? "bg-primary text-primary-foreground" : ""}`}
                variant={plan.variant}
                data-testid={`button-plan-${plan.name.toLowerCase()}`}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        {/* Trust indicators */}
        <div className="flex flex-wrap justify-center gap-8 mt-16 text-sm font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            <span>Sin tarjeta de crédito</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            <span>Cancela cuando quieras</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            <span>Garantía de 7 días</span>
          </div>
        </div>
      </div>
    </section>
  );
}
