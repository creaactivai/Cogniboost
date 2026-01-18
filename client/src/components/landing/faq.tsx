import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const faqs = [
  {
    question: "¿En qué se diferencia CogniBoost de otros cursos online?",
    answer: "A diferencia de los cursos grabados que tienen tasas de abandono del 95%, CogniBoost combina contenido experto con cohortes de aprendizaje activo. Avanzas con un grupo de profesionales que te mantienen comprometido. Además, trabajas en proyectos reales que puedes mostrar a empleadores.",
  },
  {
    question: "¿Cómo funcionan las cohortes?",
    answer: "Cada cohorte tiene 8-12 profesionales con objetivos similares. Avanzan juntos durante 4-6 semanas, con sesiones en vivo semanales con expertos y espacios de discusión. La responsabilidad grupal es lo que impulsa las tasas de finalización del 87%.",
  },
  {
    question: "¿Los cursos son en vivo o pregrabados?",
    answer: "Combinamos ambos formatos. Tienes acceso a contenido pregrabado para estudiar a tu ritmo, más sesiones en vivo semanales con expertos y tu cohorte. Este modelo híbrido maximiza flexibilidad y responsabilidad.",
  },
  {
    question: "¿Puedo cambiar mi nivel de suscripción?",
    answer: "¡Por supuesto! Puedes subir o bajar tu plan en cualquier momento. Las mejoras toman efecto inmediatamente, y recibirás crédito por la porción no utilizada de tu plan actual. Los cambios a planes menores toman efecto al final de tu período de facturación actual.",
  },
  {
    question: "¿Ofrecen certificados?",
    answer: "Sí. Al completar cada curso recibes un certificado digital verificable que puedes compartir en LinkedIn. Más importante aún, tendrás un proyecto real que demuestra tus nuevas habilidades a empleadores potenciales.",
  },
  {
    question: "¿Qué áreas de desarrollo cubren?",
    answer: "Cubrimos 20+ áreas incluyendo Liderazgo, Product Management, Data Analytics, Marketing Digital, Ventas B2B, Finanzas, y habilidades de comunicación. El catálogo se actualiza mensualmente según demanda del mercado.",
  },
  {
    question: "¿Cómo sé qué curso es el correcto para mí?",
    answer: "Cuando te registras, realizas una evaluación que identifica tus fortalezas, áreas de mejora y objetivos profesionales. Te recomendamos un camino de aprendizaje personalizado basado en tu perfil y metas.",
  },
  {
    question: "¿Qué métodos de pago aceptan?",
    answer: "Aceptamos todas las principales tarjetas de crédito a nivel mundial. Para usuarios latinoamericanos, también aceptamos métodos de pago locales a través de MercadoPago, incluyendo PIX en Brasil, Boleto Bancário, y tarjetas de débito locales en México, Argentina y Colombia.",
  },
];

export function FAQ() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center mb-8">
          <p className="text-sm text-primary uppercase tracking-widest mb-4">
            Preguntas Frecuentes
          </p>
        </div>

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger 
            className="w-full flex items-center justify-center gap-4 group cursor-pointer py-4"
            data-testid="faq-main-trigger"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-center">
              Preguntas
              <br />
              <span className="text-[hsl(174_58%_56%)]">Comunes</span>
            </h2>
            <div className={`w-12 h-12 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
              <ChevronDown className="w-6 h-6 text-muted-foreground" />
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-12 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border border-border bg-card px-6 data-[state=open]:bg-card/80 rounded-md"
                >
                  <AccordionTrigger
                    className="text-left py-5 hover:no-underline gap-4"
                    data-testid={`faq-trigger-${index}`}
                  >
                    <span className="text-sm md:text-base">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-muted-foreground text-sm leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </section>
  );
}
