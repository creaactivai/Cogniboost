import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Users, BookOpen, Award } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Grid pattern background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />
      
      {/* Cyan accent blob */}
      <div className="absolute top-20 right-20 w-96 h-96 bg-primary/20 blur-3xl" />
      <div className="absolute bottom-20 left-20 w-80 h-80 bg-accent/20 blur-3xl" />
      
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

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-accent text-accent-foreground px-8 py-6 text-lg font-mono uppercase tracking-wider"
                data-testid="button-start-trial"
              >
                Prueba Gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <button 
                className="glassy-button px-8 py-4 text-lg font-mono uppercase tracking-wider flex items-center justify-center"
                data-testid="button-how-it-works"
              >
                <Play className="mr-2 h-5 w-5" />
                Ver Cómo Funciona
              </button>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-8 pt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div 
                    key={i} 
                    className="w-10 h-10 bg-gradient-to-br from-primary/30 to-accent/30 border-2 border-background flex items-center justify-center"
                  >
                    <span className="text-xs font-mono">{i}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm font-mono text-muted-foreground">
                Únete a <span className="text-foreground font-bold">5,000+</span> profesionales mejorando su inglés
              </p>
            </div>
          </div>

          {/* Right content - Stats cards */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-8 bg-card border border-card-border hover-elevate">
                <BookOpen className="w-10 h-10 text-primary mb-4" />
                <p className="text-4xl font-display">100+</p>
                <p className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Cursos Disponibles</p>
              </div>
              <div className="p-8 bg-card border border-card-border hover-elevate">
                <Users className="w-10 h-10 text-accent mb-4" />
                <p className="text-4xl font-display">500+</p>
                <p className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Labs en Vivo al Mes</p>
              </div>
              <div className="p-8 bg-card border border-card-border hover-elevate">
                <Award className="w-10 h-10 text-primary mb-4" />
                <p className="text-4xl font-display">95%</p>
                <p className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Tasa de Satisfacción</p>
              </div>
              <div className="p-8 bg-primary text-primary-foreground">
                <p className="text-4xl font-display">A1-C2</p>
                <p className="text-sm font-mono uppercase tracking-wider opacity-80">Todos los Niveles</p>
              </div>
            </div>

            {/* Decorative element */}
            <div className="absolute -bottom-8 -right-8 w-32 h-32 border-4 border-accent -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
}
