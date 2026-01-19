import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const testimonials = [
  {
    name: "Dorca NG",
    role: "Empresaria",
    company: "",
    quote: "Me encanta este curso y la profesora es increíble. He aprendido muchísimas cosas. He estudiado en muchísimos institutos y dar con este ha sido la mejor decisión de mi vida.",
    image: "",
    initials: "DN",
  },
  {
    name: "Roberto Encarnación",
    role: "Active Member",
    company: "ARMY",
    quote: "Seré breve: NO LO DUDES, INSCRÍBETE. Lo que más me sorprendió de este curso es que lo practicas inmediatamente. Perdí el miedo de hablarlo y de ser un A2 pasé a un B2 en solo 2 meses.",
    image: "",
    initials: "RE",
  },
  {
    name: "Lawdelina Paulino",
    role: "Empresaria",
    company: "Housing Dominicana / Dento Imagen",
    quote: "Recomiendo este curso de inglés con total confianza. Cada día adquiero nuevos conocimientos. La profesora es sumamente profesional y atenta, creando un ambiente de aprendizaje ideal.",
    image: "",
    initials: "LP",
  },
  {
    name: "Mayvelin Consuegra",
    role: "Locutora Profesional",
    company: "",
    quote: "Estoy fascinada con esta plataforma. Tengo más de 45 años y estoy aprendiendo. Las clases pre-grabadas son claras, precisas, digeribles. Las clases en vivo son mágicas, la pedagogía es de alta gama.",
    image: "",
    initials: "MC",
  },
  {
    name: "Joel Tavarez",
    role: "Estudiante",
    company: "",
    quote: "La forma de dar clases y explicar los temas es excelente, se aprende y entiende rápido.",
    image: "",
    initials: "JT",
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
                        - {testimonial.name}, {testimonial.role}{testimonial.company ? ` - ${testimonial.company}` : ""}
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
