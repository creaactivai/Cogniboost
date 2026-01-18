import { Play, Users, TrendingUp, Sparkles } from "lucide-react";
import { AnimatedSection } from "@/hooks/use-scroll-animation";

const steps = [
  {
    number: "01",
    icon: Play,
    title: "APRENDE A TU RITMO",
    description: "Estudia con cursos pregrabados (niveles A1-C2) que cubren gramática, vocabulario y escenarios del mundo real. Mira cuando quieras, donde quieras.",
    color: "primary",
  },
  {
    number: "02",
    icon: Users,
    title: "PRACTICA CONVERSACIONES EN VIVO",
    description: "Únete a los Laboratorios de Práctica: sesiones en grupos pequeños donde discutes temas que te interesan con compañeros de tu nivel.",
    color: "accent",
    badge: "MÉTODO REVOLUCIONARIO",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "SIGUE TU PROGRESO",
    description: "Monitorea tu mejora, obtén certificados y avanza a través de los niveles con análisis detallados y recomendaciones personalizadas.",
    color: "primary",
  },
];

export function Methodology() {
  return (
    <section className="py-32 bg-card border-y border-border">
      <div className="container mx-auto px-6">
        {/* Section header with slide-from-left animation */}
        <AnimatedSection animation="fade-left" className="text-center mb-20">
          <p className="text-sm font-mono text-primary uppercase tracking-widest mb-4">CÓMO FUNCIONA</p>
          <h2 className="text-4xl md:text-6xl font-display uppercase mb-6">
            APRENDE <span className="text-primary">→</span> PRACTICA <span className="text-accent">→</span> DOMINA
          </h2>
          <p className="text-lg text-muted-foreground font-mono max-w-2xl mx-auto">
            Nuestra metodología de tres pasos comprobada te ayuda a lograr fluidez real en inglés, 
            combinando aprendizaje a tu ritmo con práctica en vivo.
          </p>
        </AnimatedSection>

        {/* Steps grid with slide-from-bottom animation */}
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <AnimatedSection key={step.number} animation="fade-up" delay={index * 150}>
              <div 
                className="relative p-8 bg-background border border-border hover-elevate group transition-colors duration-300 rounded-lg h-full"
              >
                {/* Badge */}
                {step.badge && (
                  <div className="absolute -top-3 left-8 px-3 py-1 bg-accent text-accent-foreground text-xs font-mono uppercase tracking-wider rounded-lg">
                    {step.badge}
                  </div>
                )}

                {/* Step number */}
                <p className={`text-8xl font-display opacity-10 absolute top-4 right-4 ${step.color === "accent" ? "text-accent" : "text-primary"}`}>
                  {step.number}
                </p>

                {/* Icon */}
                <div className={`w-16 h-16 flex items-center justify-center mb-6 rounded-lg ${step.color === "accent" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}`}>
                  <step.icon className="w-8 h-8" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-display uppercase mb-4">{step.title}</h3>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
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
      stat: "7x",
      label: "MÁS TIEMPO HABLANDO",
      description: "Más práctica oral que en clases tradicionales",
    },
    {
      stat: "3-4",
      label: "COMPAÑEROS POR GRUPO",
      description: "Practica con pares, sin la presión del profesor",
    },
    {
      stat: "20+",
      label: "CATEGORÍAS DE TEMAS",
      description: "Elige temas desde negocios hasta viajes y tecnología",
    },
    {
      stat: "30+",
      label: "MINUTOS HABLANDO",
      description: "Diálogo natural, no ejercicios artificiales",
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
              <span className="text-sm font-mono uppercase tracking-widest text-primary">Destacado</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-display uppercase">
              LABORATORIOS
              <br />
              DE PRÁCTICA
              <br />
              <span className="text-accent">CONVERSACIONAL</span>
            </h2>

            <p className="text-lg font-mono opacity-80 leading-relaxed">
              Las clases tradicionales te dan 5 minutos para hablar. Nuestros labs te dan 30+. 
              Después de una breve introducción donde los instructores enseñan frases clave y vocabulario, 
              te unes a salas de práctica con 3-4 compañeros que comparten tus intereses.
            </p>

            <p className="text-lg font-mono opacity-80 leading-relaxed">
              Discute negocios, viajes, tecnología, cultura—temas que te IMPORTAN. Nuestros facilitadores 
              rotan por las salas, brindando retroalimentación y manteniendo las conversaciones fluidas.
            </p>
          </div>

          {/* Right content - Benefits grid */}
          <div className="grid grid-cols-2 gap-4">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="p-6 border border-background/20 hover:border-primary/50 transition-colors"
              >
                <p className="text-5xl font-display text-primary mb-2">{benefit.stat}</p>
                <p className="text-sm font-mono uppercase tracking-wider mb-2">{benefit.label}</p>
                <p className="text-xs font-mono opacity-60">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
