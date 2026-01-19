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
    answer: "A diferencia de los cursos donde te dicen qué temas aprender y de qué hablar (que tienen tasas de abandono del 95%), CogniBoost usa Class Labs donde hablas de temas que te interesan y ayudan a tu carrera. Avanzas con profesionales y estudiantes con objetivos similares, guiados por instructores nativos nivel C2. Por eso tenemos tasas de finalización del 87%.",
  },
  {
    question: "¿Cómo funcionan los Class Labs?",
    answer: "Cada Class Lab tiene 8-12 profesionales con objetivos similares. Avanzan juntos durante 8 semanas promedio, con sesiones en vivo sobre temas de tu interés y expertos dándote feedback en tiempo real. La combinación de temas relevantes y comunidad es lo que impulsa las tasas de finalización del 87%.",
  },
  {
    question: "¿Los cursos son en vivo o pregrabados?",
    answer: "Combinamos ambos formatos. Tienes acceso a contenido pregrabado para estudiar a tu ritmo, más sesiones en vivo semanales en Class Labs sobre temas de tu interés. Este modelo híbrido maximiza flexibilidad y resultados.",
  },
  {
    question: "¿Puedo cancelar mi suscripción?",
    answer: "¡Por supuesto! Puedes cancelar en cualquier momento y no se te cobrará el próximo mes. Ten en cuenta que no se acredita la porción no utilizada del período actual. Los cambios a planes menores toman efecto al final de tu período de facturación.",
  },
  {
    question: "¿Ofrecen certificados?",
    answer: "Sí. Al completar cada curso recibes un certificado digital verificable que puedes compartir en LinkedIn. Más importante aún, tendrás proyectos reales que demuestran tus nuevas habilidades a empleadores potenciales.",
  },
  {
    question: "¿Cuáles temas están disponibles en las sesiones en vivo?",
    answer: "Nuestros Class Labs cubren más de 20 áreas que incluyen categorías principales como Negocios en General, Entretenimiento, Cultura, Deporte, Relaciones Interpersonales, y más. Dentro de cada categoría hay labs específicos como Real Estate en Negocios, Películas en Entretenimiento, etc.",
  },
  {
    question: "¿Cómo sé qué curso es el correcto para mí?",
    answer: "Cuando te registras, realizas una evaluación que identifica tus fortalezas, áreas de mejora y objetivos personales y profesionales. Te recomendamos un camino de aprendizaje personalizado basado en tu perfil y metas específicas.",
  },
  {
    question: "¿Qué métodos de pago aceptan?",
    answer: "Aceptamos todas las tarjetas de crédito y débito a nivel mundial. También aceptamos métodos de pago como PayPal, Google Pay, Apple Pay, y Pay Over Time en Estados Unidos.",
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
