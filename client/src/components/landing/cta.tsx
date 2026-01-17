import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="py-32 bg-foreground text-background relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      
      {/* Accent elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent/10 blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Headline */}
          <h2 className="text-5xl md:text-7xl font-display uppercase mb-8">
            ¿LISTO PARA
            <br />
            <span className="text-primary">TRANSFORMAR</span>
            <br />
            TU INGLÉS?
          </h2>

          {/* Subtext */}
          <p className="text-xl font-mono opacity-80 mb-12 max-w-2xl mx-auto">
            Únete a miles de profesionales latinoamericanos que están logrando 
            fluidez real a través de nuestra metodología comprobada.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-accent text-accent-foreground px-10 py-7 text-lg font-mono uppercase tracking-wider"
              data-testid="button-cta-start-trial"
            >
              Comenzar Prueba Gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-background/30 text-background hover:bg-background/10 px-10 py-7 text-lg font-mono uppercase tracking-wider"
              data-testid="button-cta-book-demo"
            >
              <Calendar className="mr-2 h-5 w-5" />
              Agendar Demo
            </Button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-8 mt-16 text-sm font-mono opacity-60">
            <span>Sin tarjeta de crédito</span>
            <span>•</span>
            <span>7 días de prueba gratis</span>
            <span>•</span>
            <span>Cancela cuando quieras</span>
          </div>
        </div>
      </div>
    </section>
  );
}
