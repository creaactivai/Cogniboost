import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { useBooking } from "@/contexts/booking-context";

export function FinalCTA() {
  const { openBooking } = useBooking();

  return (
    <section className="py-32 bg-foreground text-background relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      
      {/* Accent elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-[hsl(174_58%_56%/0.1)] blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Headline */}
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            ¿Listo para
            <br />
            <span className="text-primary">Elevar Tu Carrera?</span>
          </h2>

          {/* Subtext */}
          <p className="text-xl opacity-80 mb-12 max-w-2xl mx-auto">
            Únete a miles de profesionales hispanohablantes que están acelerando 
            su crecimiento profesional con habilidades prácticas y aplicables.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={openBooking}
              data-testid="button-cta-free-class"
            >
              <Calendar className="mr-2 h-5 w-5" />
              Clase Gratis!
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-background/30 text-background"
              onClick={openBooking}
              data-testid="button-cta-book-demo"
            >
              <Calendar className="mr-2 h-5 w-5" />
              Agendar Demo
            </Button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-8 mt-16 text-sm opacity-60">
            <span>Sin tarjeta de crédito</span>
            <span>•</span>
            <span>Primera semana gratis</span>
            <span>•</span>
            <span>Garantía de satisfacción</span>
          </div>
        </div>
      </div>
    </section>
  );
}
