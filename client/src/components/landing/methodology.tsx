import { Play, Users, TrendingUp, Sparkles, Target, Briefcase } from "lucide-react";
import { AnimatedSection } from "@/hooks/use-scroll-animation";

const steps = [
  {
    number: "01",
    icon: Play,
    title: "Aprende de Expertos",
    description: "Cursos diseñados por profesionales activos en la industria. Habilidades prácticas que puedes aplicar desde el día uno, no teoría abstracta.",
    color: "primary",
  },
  {
    number: "02",
    icon: Users,
    title: "Practica en Comunidad",
    description: "Únete a cohortes de aprendizaje con profesionales como tú. Responsabilidad grupal que elimina la procrastinación.",
    color: "turquoise",
    badge: "MÉTODO PROBADO",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Avanza Tu Carrera",
    description: "Proyectos reales, conexiones profesionales y resultados medibles que impulsan tu crecimiento profesional.",
    color: "primary",
  },
];

export function Methodology() {
  return (
    <section className="py-32 bg-card border-y border-border relative overflow-hidden">
      {/* Floating decorative elements */}
      <div className="absolute top-20 left-10 w-24 h-24 border-4 border-primary/30 rounded float-animation" style={{ animationDelay: "0s" }} />
      <div className="absolute bottom-32 right-16 w-20 h-20 border-4 border-[hsl(174_58%_56%/0.4)] rounded float-animation" style={{ animationDelay: "2s" }} />
      <div className="absolute top-1/2 right-8 w-16 h-16 border-4 border-primary/20 rounded float-animation" style={{ animationDelay: "1s" }} />
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Section header with slide-from-left animation */}
        <AnimatedSection animation="fade-left" className="text-center mb-20">
          <p className="text-sm text-primary uppercase tracking-widest mb-4">Cómo Funciona</p>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Aprende <span className="text-primary">→</span> Practica <span className="text-[hsl(174_58%_56%)]">→</span> Avanza
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Nuestra metodología de tres pasos comprobada te ayuda a adquirir habilidades reales, 
            combinando instrucción experta con práctica aplicada.
          </p>
        </AnimatedSection>

        {/* Steps grid with slide-from-bottom animation */}
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <AnimatedSection key={step.number} animation="fade-up" delay={index * 150}>
              <div 
                className="relative p-8 bg-background border border-border hover-elevate group transition-colors duration-300 rounded h-full"
              >
                {/* Badge */}
                {step.badge && (
                  <div className="absolute -top-3 left-8 px-3 py-1 bg-[hsl(174_58%_56%)] text-[hsl(240_42%_18%)] text-xs uppercase tracking-wider rounded">
                    {step.badge}
                  </div>
                )}

                {/* Step number */}
                <p className={`text-8xl font-bold opacity-10 absolute top-4 right-4 ${step.color === "turquoise" ? "text-[hsl(174_58%_56%)]" : "text-primary"}`}>
                  {step.number}
                </p>

                {/* Icon */}
                <div className={`w-16 h-16 flex items-center justify-center mb-6 rounded ${step.color === "turquoise" ? "bg-[hsl(174_58%_56%)] text-[hsl(240_42%_18%)]" : "bg-primary text-primary-foreground"}`}>
                  <step.icon className="w-8 h-8" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-4">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>

                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-border z-10" />
                )}
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ConversationLabsDeepDive() {
  const benefits = [
    {
      stat: "10x",
      label: "RETORNO DE INVERSIÓN",
      description: "Incremento salarial promedio de nuestros graduados",
    },
    {
      stat: "8-12",
      label: "PROFESIONALES POR COHORTE",
      description: "Grupos pequeños para networking efectivo",
    },
    {
      stat: "20+",
      label: "INDUSTRIAS CUBIERTAS",
      description: "Desde tech hasta finanzas, marketing y más",
    },
    {
      stat: "4",
      label: "SEMANAS PROMEDIO",
      description: "Tiempo para completar cada módulo práctico",
    },
  ];

  return (
    <section className="py-32 bg-foreground text-background">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm uppercase tracking-widest text-primary">Destacado</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold">
              Aprendizaje
              <br />
              Basado en
              <br />
              <span className="text-[hsl(174_58%_56%)]">Cohortes</span>
            </h2>

            <p className="text-lg opacity-80 leading-relaxed">
              Los cursos a tu ritmo tienen tasas de abandono del 95%. Nuestras cohortes tienen 
              tasas de finalización del 87%. La diferencia: responsabilidad comunitaria.
            </p>

            <p className="text-lg opacity-80 leading-relaxed">
              Avanza junto a profesionales con objetivos similares. Sesiones en vivo semanales 
              con expertos de la industria. Proyectos reales que puedes mostrar a empleadores.
            </p>
          </div>

          {/* Right content - Benefits grid */}
          <div className="grid grid-cols-2 gap-4">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="p-6 border border-background/20 hover:border-primary/50 transition-colors rounded"
              >
                <p className="text-5xl font-bold text-primary mb-2">{benefit.stat}</p>
                <p className="text-sm uppercase tracking-wider mb-2">{benefit.label}</p>
                <p className="text-xs opacity-60">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
