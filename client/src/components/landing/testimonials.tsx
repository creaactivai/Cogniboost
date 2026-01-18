import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const testimonials = [
  {
    name: "María García",
    role: "Gerente de Marketing",
    company: "TechStart MX",
    quote: "Después de 3 meses con CogniBoost, conseguí el ascenso que llevaba buscando. Las habilidades de liderazgo fueron clave.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    initials: "MG",
  },
  {
    name: "Carlos Rodríguez",
    role: "CTO",
    company: "SecureNet",
    quote: "La flexibilidad de aprender a mi ritmo combinada con proyectos reales es exactamente lo que necesitaba.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    initials: "CR",
  },
  {
    name: "Ana Silva",
    role: "COO",
    company: "InnovateCo",
    quote: "CogniBoost transformó mi carrera. No puedo agradecer lo suficiente el impacto que ha tenido en mi desarrollo profesional.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    initials: "AS",
  },
  {
    name: "Diego Fernández",
    role: "CFO",
    company: "FuturePlanning",
    quote: "Los cursos de finanzas son increíblemente prácticos. Puedo aplicar lo aprendido inmediatamente en mi trabajo.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    initials: "DF",
  },
  {
    name: "Roberto Costa",
    role: "Head of Design",
    company: "CreativeSolutions",
    quote: "Si pudiera dar 11 estrellas, daría 12. La mejor inversión en mi desarrollo profesional.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    initials: "RC",
  },
];

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(2);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  const getAdjustedDistance = (index: number) => {
    const diff = index - activeIndex;
    const normalizedDiff = ((diff + testimonials.length) % testimonials.length);
    return normalizedDiff > testimonials.length / 2 ? normalizedDiff - testimonials.length : normalizedDiff;
  };

  const getCardStyle = (index: number) => {
    const adjustedDiff = getAdjustedDistance(index);
    const isActive = index === activeIndex;
    const absDistance = Math.abs(adjustedDiff);
    
    if (absDistance > 2) {
      return { opacity: 0, transform: "scale(0.7)", zIndex: 0, display: "none" as const };
    }

    const scale = isActive ? 1 : 0.85 - absDistance * 0.05;
    const translateX = adjustedDiff * 280;
    const zIndex = 10 - absDistance;
    const opacity = isActive ? 1 : 0.7 - absDistance * 0.15;

    return {
      transform: `translateX(${translateX}px) scale(${scale})`,
      zIndex,
      opacity,
    };
  };

  return (
    <section className="py-24 bg-muted/30 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm text-[hsl(174_58%_56%)] uppercase tracking-widest mb-4">
            Historias de Éxito
          </p>
          <h2 className="text-3xl md:text-5xl font-bold">
            Resultados <span className="text-primary">Reales</span>
          </h2>
        </div>

        <div className="relative h-[400px] flex items-center justify-center">
          <div className="relative w-full max-w-5xl flex items-center justify-center">
            {testimonials.map((testimonial, index) => {
              const style = getCardStyle(index);
              const isActive = index === activeIndex;
              const absDistance = Math.abs(getAdjustedDistance(index));
              const isClickable = absDistance <= 2;

              return (
                <div
                  key={index}
                  data-testid={`testimonial-card-${index}`}
                  className={`absolute w-72 transition-all duration-500 ease-out ${
                    isClickable ? "cursor-pointer" : ""
                  }`}
                  style={style}
                  onClick={() => isClickable && setActiveIndex(index)}
                >
                  <Card
                    className={`overflow-visible relative ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : ""
                    }`}
                  >
                    {isActive && (
                      <div className="absolute top-4 right-4 w-12 h-12">
                        <svg viewBox="0 0 50 50" className="w-full h-full opacity-50">
                          <line x1="25" y1="0" x2="50" y2="25" stroke="currentColor" strokeWidth="2" />
                          <line x1="35" y1="0" x2="50" y2="15" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </div>
                    )}

                    <CardContent className="p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <Avatar className="w-12 h-12 border-2 border-background">
                          <AvatarImage src={testimonial.image} alt={testimonial.name} />
                          <AvatarFallback>{testimonial.initials}</AvatarFallback>
                        </Avatar>
                      </div>

                      <p className={`text-sm leading-relaxed mb-4 ${isActive ? "" : "text-foreground"}`}>
                        "{testimonial.quote}"
                      </p>

                      <p className={`text-xs ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        - {testimonial.name}, {testimonial.role} at {testimonial.company}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrev}
            data-testid="testimonial-prev"
            className="rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            data-testid="testimonial-next"
            className="rounded-full"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
