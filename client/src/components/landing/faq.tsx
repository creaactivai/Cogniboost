import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "¿En qué se diferencia CogniBoost de Duolingo o Babbel?",
    answer: "A diferencia del aprendizaje basado en apps que se enfoca en ejercicios gamificados, CogniBoost combina cursos estructurados con práctica de conversación en vivo. Pasarás 30+ minutos hablando inglés en nuestros laboratorios, comparado con los pocos minutos de ejercicios de voz en apps típicas. Nuestra metodología está diseñada para profesionales adultos que necesitan fluidez real, no solo memorización de vocabulario.",
  },
  {
    question: "¿Qué pasa si soy muy tímido/a para hablar en grupos?",
    answer: "¡Entendemos esta preocupación! Nuestros laboratorios están diseñados para ser de apoyo, no intimidantes. Practicas con compañeros de tu mismo nivel, no con hablantes avanzados. Las salas tienen solo 3-4 personas, así que se siente como charlar con amigos. Además, todos allí tienen el mismo objetivo: mejorar a través de la práctica. ¡La mayoría de estudiantes tímidos nos dicen que aman los labs después de su primera sesión!",
  },
  {
    question: "¿Se graban los laboratorios de conversación?",
    answer: "La privacidad es importante para nosotros. Los laboratorios del plan Estándar no se graban. Los miembros Premium tienen acceso a grabaciones de sus sesiones por 30 días solo para revisión personal. Todas las grabaciones son privadas y nunca se comparten públicamente.",
  },
  {
    question: "¿Puedo cambiar mi nivel de suscripción?",
    answer: "¡Por supuesto! Puedes subir o bajar tu plan en cualquier momento. Las mejoras toman efecto inmediatamente, y recibirás crédito por la porción no utilizada de tu plan actual. Los cambios a planes menores toman efecto al final de tu período de facturación actual.",
  },
  {
    question: "¿Ofrecen certificados oficiales?",
    answer: "¡Sí! Los miembros Estándar y Premium reciben certificados digitales al completar cursos y alcanzar nuevos niveles. Estos certificados incluyen enlaces de verificación y pueden compartirse en LinkedIn o agregarse a tu currículum. Aunque no son equivalentes a exámenes oficiales como TOEFL, demuestran tu compromiso con el aprendizaje.",
  },
  {
    question: "¿Qué temas se cubren en los laboratorios de conversación?",
    answer: "Ofrecemos 20+ categorías de temas incluyendo Inglés de Negocios, Tecnología, Viajes, Cultura y Artes, Salud, Finanzas y conversaciones cotidianas. Seleccionas tus temas preferidos al reservar un laboratorio, y te agrupamos con otros que comparten tus intereses.",
  },
  {
    question: "¿Cómo sé qué nivel es el correcto para mí?",
    answer: "Cuando te registras, tomarás una evaluación rápida que analiza tus habilidades de lectura, comprensión auditiva y expresión oral. Basándose en tus resultados, te recomendamos tu nivel inicial (A1 a C2). Siempre puedes ajustarlo si sientes que el nivel no es el adecuado.",
  },
  {
    question: "¿Qué métodos de pago aceptan?",
    answer: "Aceptamos todas las principales tarjetas de crédito a nivel mundial. Para usuarios latinoamericanos, también aceptamos métodos de pago locales a través de MercadoPago, incluyendo PIX en Brasil, Boleto Bancário, y tarjetas de débito locales en México, Argentina y Colombia.",
  },
];

export function FAQ() {
  return (
    <section className="py-32 bg-background">
      <div className="container mx-auto px-6 max-w-4xl">
        {/* Section header */}
        <div className="text-center mb-20">
          <p className="text-sm font-mono text-primary uppercase tracking-widest mb-4">PREGUNTAS FRECUENTES</p>
          <h2 className="text-4xl md:text-6xl font-display uppercase mb-6">
            PREGUNTAS
            <br />
            <span className="text-accent">COMUNES</span>
          </h2>
        </div>

        {/* FAQ Accordion */}
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="border border-border px-6 data-[state=open]:bg-card"
            >
              <AccordionTrigger 
                className="text-left font-mono py-6 hover:no-underline"
                data-testid={`faq-trigger-${index}`}
              >
                <span className="flex items-start gap-4">
                  <span className="text-primary font-display text-lg">{String(index + 1).padStart(2, '0')}</span>
                  <span>{faq.question}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-6 pl-10 font-mono text-muted-foreground text-sm leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
