import { Button } from "@/components/ui/button";
import { Calendar, CreditCard, XCircle, Shield } from "lucide-react";
import { useBooking } from "@/contexts/booking-context";
import { trackCTAClicked, trackBookingOpened } from "@/lib/analytics";

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
            Empieza Hoy
            <br />
            <span className="text-primary">— Tu Primera Clase Es Gratis</span>
          </h2>

          {/* Subtext */}
          <p className="text-xl opacity-80 mb-12 max-w-2xl mx-auto">
            Únete a 500+ profesionales hispanohablantes que ya hablan inglés con confianza.
          </p>

          {/* Single CTA */}
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={() => { trackCTAClicked("Reserva Tu Clase Gratis", "final-cta"); trackBookingOpened("class"); openBooking('class'); }}
              data-testid="button-cta-free-class"
            >
              <Calendar className="mr-2 h-5 w-5" />
              Reserva Tu Clase Gratis
            </Button>
          </div>

          {/* Trust badges with icons */}
          <div className="flex flex-wrap justify-center gap-8 mt-16 text-sm opacity-70">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span>Sin tarjeta de crédito</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              <span>Cancela cuando quieras</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Garantía de satisfacción</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
