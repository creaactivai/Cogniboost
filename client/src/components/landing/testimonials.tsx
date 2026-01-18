import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    name: "María García",
    role: "Gerente de Marketing",
    location: "Ciudad de México",
    quote: "Después de 3 meses con CogniBoost, finalmente me siento segura hablando inglés en reuniones. Los laboratorios de conversación lo cambiaron todo.",
    rating: 5,
    beforeLevel: "A2",
    afterLevel: "B2",
    avatar: "MG",
  },
  {
    name: "Carlos Rodríguez",
    role: "Ingeniero de Software",
    location: "São Paulo",
    quote: "La flexibilidad de aprender a mi ritmo combinada con sesiones de práctica real es exactamente lo que necesitaba. No más aprendizaje solo con libros.",
    rating: 5,
    beforeLevel: "B1",
    afterLevel: "C1",
    avatar: "CR",
  },
  {
    name: "Ana Silva",
    role: "Directora de RRHH",
    location: "Bogotá",
    quote: "Probé muchas aplicaciones antes. CogniBoost es la primera donde realmente hablo más de lo que leo. La práctica con compañeros elimina toda la presión.",
    rating: 5,
    beforeLevel: "A2",
    afterLevel: "B1",
    avatar: "AS",
  },
  {
    name: "Diego Fernández",
    role: "Ejecutivo de Ventas",
    location: "Buenos Aires",
    quote: "Los cursos de inglés de negocios son increíblemente prácticos. Uso lo que aprendo inmediatamente en mi trabajo diario con clientes internacionales.",
    rating: 5,
    beforeLevel: "B1",
    afterLevel: "B2",
    avatar: "DF",
  },
  {
    name: "Lucía Morales",
    role: "Estudiante Universitaria",
    location: "Lima",
    quote: "¡Los laboratorios de conversación son muy divertidos! Nunca pensé que disfrutaría hablar inglés. Ahora espero cada sesión con entusiasmo.",
    rating: 5,
    beforeLevel: "A1",
    afterLevel: "B1",
    avatar: "LM",
  },
  {
    name: "Roberto Costa",
    role: "Emprendedor",
    location: "Río de Janeiro",
    quote: "De apenas entender inglés a negociar en él. El enfoque estructurado y la práctica en vivo hicieron toda la diferencia.",
    rating: 5,
    beforeLevel: "A2",
    afterLevel: "B2",
    avatar: "RC",
  },
];

export function Testimonials() {
  return (
    <section className="py-32 bg-card border-y border-border">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-20">
          <p className="text-sm font-mono text-accent uppercase tracking-widest mb-4">HISTORIAS DE ÉXITO</p>
          <h2 className="text-4xl md:text-6xl font-display uppercase mb-6">
            RESULTADOS <span className="text-primary">REALES</span>
            <br />
            DE ESTUDIANTES REALES
          </h2>
        </div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="p-8 bg-background border border-border hover-scale hover-glow transition-all duration-300 group rounded-[9%]"
            >
              {/* Quote icon */}
              <Quote className="w-8 h-8 text-primary/20 mb-4" />
              
              {/* Quote text */}
              <p className="text-foreground font-mono text-sm leading-relaxed mb-6">
                "{testimonial.quote}"
              </p>

              {/* Rating */}
              <div className="flex gap-1 mb-6">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                ))}
              </div>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent flex items-center justify-center text-background font-display text-sm">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-mono font-semibold">{testimonial.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{testimonial.role} • {testimonial.location}</p>
                </div>
              </div>

              {/* Level progression */}
              <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground uppercase">Progreso</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-muted text-xs font-mono">{testimonial.beforeLevel}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-mono">{testimonial.afterLevel}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
