import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, Users, BookOpen, Award } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { useEffect, useState } from "react";
import { AnimatedSection } from "@/hooks/use-scroll-animation";
import { useBooking } from "@/contexts/booking-context";

const WHATSAPP_LINK = "https://chat.whatsapp.com/DKAjOGcbzjsJUzg9R7dTHJ";

export function Hero() {
  const [scrollY, setScrollY] = useState(0);
  const { openBooking } = useBooking();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Grid pattern background with parallax */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20"
        style={{ transform: `translateY(${scrollY * 0.1}px)` }}
      />
      {/* Animated accent blobs with parallax */}
      <div 
        className="absolute top-20 right-20 w-96 h-96 bg-primary/15 blur-3xl float-animation"
        style={{ transform: `translateY(${scrollY * 0.2}px)` }}
      />
      <div 
        className="absolute bottom-20 left-20 w-80 h-80 bg-[hsl(174_58%_56%/0.15)] blur-3xl float-animation"
        style={{ animationDelay: "3s", transform: `translateY(${scrollY * 0.15}px)` }}
      />
      <div className="relative z-10 container mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-sm uppercase tracking-wider">Para Hispanohablantes</span>
            </div>

            {/* Main headline - New brand messaging */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              Deja de coleccionar certificados.
              <br />
              <span className="text-primary">Empieza a construir carreras.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-lg">
              Educación orientada a resultados diseñada para aplicación en el mundo real. 
              Aprende de profesionales, no de académicos.
            </p>

            {/* CTA Buttons - Purple primary per brand guidelines */}
            <div className="flex flex-row gap-4 flex-wrap items-stretch">
              <Button 
                size="lg" 
                className="w-[200px] justify-center"
                onClick={() => openBooking('class')}
                data-testid="button-free-class"
              >
                <Calendar className="mr-2 h-5 w-5" />
                Clase Gratis!
              </Button>
              <Link href="/placement-quiz" className="contents">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-[200px] justify-center"
                  data-testid="button-placement-quiz"
                >
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Evaluar Mi Nivel
                </Button>
              </Link>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="contents">
                <Button 
                  size="lg"
                  variant="outline"
                  className="w-[200px] justify-center"
                  data-testid="button-whatsapp"
                >
                  <SiWhatsapp className="mr-2 h-5 w-5" />
                  Asistencia
                </Button>
              </a>
            </div>

            {/* Social proof */}
            <div className="pt-4">
              <p className="text-sm text-muted-foreground">
                Únete a <span className="text-foreground font-semibold">500+</span> profesionales avanzando sus carreras
              </p>
            </div>
          </div>

          {/* Right content - Stats cards with hover effects and slide-in animations */}
          <div className="relative" style={{ transform: `translateY(${scrollY * -0.05}px)` }}>
            <div className="grid grid-cols-2 gap-4">
              <AnimatedSection animation="fade-left" delay={100} className="h-full">
                <div className="p-6 bg-card border border-card-border hover-elevate rounded transition-colors duration-300 h-full">
                  <BookOpen className="w-8 h-8 text-primary mb-3" />
                  <p className="text-3xl font-bold">100+</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Cursos Prácticos</p>
                </div>
              </AnimatedSection>
              <AnimatedSection animation="fade-left" delay={200} className="h-full">
                <div className="p-6 bg-card border border-card-border hover-elevate rounded transition-colors duration-300 h-full">
                  <Users className="w-8 h-8 text-[hsl(174_58%_56%)] mb-3" />
                  <p className="text-3xl font-bold">500+</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Sesiones en Vivo</p>
                </div>
              </AnimatedSection>
              <AnimatedSection animation="fade-left" delay={300} className="h-full">
                <div className="p-6 bg-card border border-card-border hover-elevate rounded transition-colors duration-300 h-full">
                  <Award className="w-8 h-8 text-primary mb-3" />
                  <p className="text-3xl font-bold">95%</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Tasa de Satisfacción</p>
                </div>
              </AnimatedSection>
              <AnimatedSection animation="fade-left" delay={400} className="h-full">
                <div className="p-6 bg-primary text-primary-foreground hover-elevate rounded transition-colors duration-300 h-full">
                  <TrendingUp className="w-8 h-8 mb-3" />
                  <p className="text-3xl font-bold">3x</p>
                  <p className="text-xs uppercase tracking-wider opacity-80">Más Rápido</p>
                </div>
              </AnimatedSection>
            </div>

            {/* Decorative element with float animation */}
            <div className="absolute -bottom-8 -right-8 w-32 h-32 border-4 border-[hsl(174_58%_56%)] rounded -z-10 float-animation" style={{ animationDelay: "1.5s" }} />
          </div>
        </div>
      </div>
    </section>
  );
}
