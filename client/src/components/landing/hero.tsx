import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Users, BookOpen, Award, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatedSection } from "@/hooks/use-scroll-animation";

export function Hero() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Grid pattern background with parallax */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30"
        style={{ transform: `translateY(${scrollY * 0.1}px)` }}
      />
      
      {/* Animated accent blobs with parallax */}
      <div 
        className="absolute top-20 right-20 w-96 h-96 bg-primary/20 blur-3xl float-animation"
        style={{ transform: `translateY(${scrollY * 0.2}px)` }}
      />
      <div 
        className="absolute bottom-20 left-20 w-80 h-80 bg-accent/20 blur-3xl float-animation"
        style={{ animationDelay: "3s", transform: `translateY(${scrollY * 0.15}px)` }}
      />
      
      <div className="relative z-10 container mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30">
              <span className="w-2 h-2 bg-primary animate-pulse" />
              <span className="text-sm font-mono uppercase tracking-wider">Disponible en Latinoamérica</span>
            </div>

            {/* Main headline */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-display uppercase leading-none tracking-tight">
              DOMINA EL
              <br />
              <span className="text-primary">INGLÉS</span>
              <br />
              CON
              <br />
              <span className="text-accent">CONVERSACIONES</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-lg font-mono">
              Cursos pregrabados + laboratorios de práctica en vivo diseñados para adultos latinoamericanos. 
              Aprende a tu ritmo, habla con confianza.
            </p>

            {/* CTA Buttons - uniform width, horizontal row, rounded corners */}
            <div className="flex flex-row gap-4 flex-wrap">
              <Button 
                size="lg" 
                className="bg-accent text-accent-foreground w-[220px] font-mono uppercase tracking-wider rounded-lg justify-center"
                data-testid="button-start-trial"
              >
                Prueba Gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Link href="/placement-quiz">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-[220px] font-mono uppercase tracking-wider rounded-lg justify-center"
                  data-testid="button-placement-quiz"
                >
                  <Target className="mr-2 h-5 w-5" />
                  Examen de Nivel
                </Button>
              </Link>
              <Button 
                size="lg"
                variant="secondary"
                className="w-[220px] font-mono uppercase tracking-wider rounded-lg justify-center backdrop-blur-sm"
                data-testid="button-how-it-works"
              >
                <Play className="mr-2 h-5 w-5" />
                Cómo Funciona
              </Button>
            </div>

            {/* Social proof */}
            <div className="pt-4">
              <p className="text-sm font-mono text-muted-foreground">
                Únete a <span className="text-foreground font-bold">5,000+</span> profesionales mejorando su inglés
              </p>
            </div>
          </div>

          {/* Right content - Stats cards with hover effects and slide-in animations */}
          <div className="relative" style={{ transform: `translateY(${scrollY * -0.05}px)` }}>
            <div className="grid grid-cols-2 gap-4">
              <AnimatedSection animation="fade-left" delay={100} className="h-full">
                <div className="p-8 bg-card border border-card-border hover-elevate rounded-lg transition-colors duration-300 h-full">
                  <BookOpen className="w-10 h-10 text-primary mb-4" />
                  <p className="text-4xl font-display">100+</p>
                  <p className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Cursos Disponibles</p>
                </div>
              </AnimatedSection>
              <AnimatedSection animation="fade-left" delay={200} className="h-full">
                <div className="p-8 bg-card border border-card-border hover-elevate rounded-lg transition-colors duration-300 h-full">
                  <Users className="w-10 h-10 text-accent mb-4" />
                  <p className="text-4xl font-display">500+</p>
                  <p className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Labs en Vivo al Mes</p>
                </div>
              </AnimatedSection>
              <AnimatedSection animation="fade-left" delay={300} className="h-full">
                <div className="p-8 bg-card border border-card-border hover-elevate rounded-lg transition-colors duration-300 h-full">
                  <Award className="w-10 h-10 text-primary mb-4" />
                  <p className="text-4xl font-display">95%</p>
                  <p className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Tasa de Satisfacción</p>
                </div>
              </AnimatedSection>
              <AnimatedSection animation="fade-left" delay={400} className="h-full">
                <div className="p-8 bg-primary text-primary-foreground hover-elevate rounded-lg transition-colors duration-300 h-full">
                  <p className="text-4xl font-display">A1-C2</p>
                  <p className="text-sm font-mono uppercase tracking-wider opacity-80">Todos los Niveles</p>
                </div>
              </AnimatedSection>
            </div>

            {/* Decorative element with float animation */}
            <div className="absolute -bottom-8 -right-8 w-32 h-32 border-4 border-accent -z-10 float-animation" style={{ animationDelay: "1.5s" }} />
          </div>
        </div>
      </div>
    </section>
  );
}
