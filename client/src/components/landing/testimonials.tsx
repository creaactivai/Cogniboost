import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    name: "María García",
    role: "Gerente de Marketing",
    location: "Ciudad de México",
    quote: "Después de 3 meses con CogniBoost, conseguí el ascenso que llevaba buscando. Las habilidades de liderazgo y comunicación fueron clave.",
    rating: 5,
    beforeLevel: "Junior",
    afterLevel: "Senior",
    avatar: "MG",
  },
  {
    name: "Carlos Rodríguez",
    role: "Ingeniero de Software",
    location: "São Paulo",
    quote: "La flexibilidad de aprender a mi ritmo combinada con proyectos reales es exactamente lo que necesitaba para dar el salto a empresas internacionales.",
    rating: 5,
    beforeLevel: "Mid",
    afterLevel: "Staff",
    avatar: "CR",
  },
  {
    name: "Ana Silva",
    role: "Directora de RRHH",
    location: "Bogotá",
    quote: "Probé muchos cursos antes. CogniBoost es el primero donde aplicas lo que aprendes inmediatamente. Las cohortes te mantienen comprometida.",
    rating: 5,
    beforeLevel: "Especialista",
    afterLevel: "Directora",
    avatar: "AS",
  },
  {
    name: "Diego Fernández",
    role: "Ejecutivo de Ventas",
    location: "Buenos Aires",
    quote: "Los cursos de negociación y ventas son increíblemente prácticos. Duplicé mi comisión en 6 meses aplicando las técnicas aprendidas.",
    rating: 5,
    beforeLevel: "$5K",
    afterLevel: "$12K",
    avatar: "DF",
  },
  {
    name: "Lucía Morales",
    role: "Product Manager",
    location: "Lima",
    quote: "Las sesiones de mentoría con expertos de la industria cambiaron mi perspectiva. Transicioné de desarrollo a producto gracias a CogniBoost.",
    rating: 5,
    beforeLevel: "Dev",
    afterLevel: "PM",
    avatar: "LM",
  },
  {
    name: "Roberto Costa",
    role: "Emprendedor",
    location: "Río de Janeiro",
    quote: "De empleado a fundador de mi startup. El enfoque práctico y las conexiones que hice con otros profesionales hicieron toda la diferencia.",
    rating: 5,
    beforeLevel: "Empleado",
    afterLevel: "CEO",
    avatar: "RC",
  },
];

export function Testimonials() {
  return (
    <section className="py-32 bg-card border-y border-border relative overflow-hidden">
      {/* Floating decorative elements */}
      <div className="absolute top-24 right-12 w-28 h-28 border-4 border-[hsl(174_58%_56%/0.3)] rounded float-animation" style={{ animationDelay: "0.5s" }} />
      <div className="absolute bottom-20 left-8 w-20 h-20 border-4 border-primary/40 rounded float-animation" style={{ animationDelay: "2.5s" }} />
      <div className="absolute top-1/3 left-16 w-14 h-14 border-4 border-[hsl(174_58%_56%/0.2)] rounded float-animation" style={{ animationDelay: "1.5s" }} />
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Section header */}
        <div className="text-center mb-20">
          <p className="text-sm text-[hsl(174_58%_56%)] uppercase tracking-widest mb-4">Historias de Éxito</p>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Resultados <span className="text-primary">Reales</span>
            <br />
            de Profesionales Reales
          </h2>
        </div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="p-8 bg-background border border-border hover-elevate transition-colors duration-300 group rounded"
            >
              {/* Quote icon */}
              <Quote className="w-8 h-8 text-primary/20 mb-4" />
              
              {/* Quote text */}
              <p className="text-foreground text-sm leading-relaxed mb-6">
                "{testimonial.quote}"
              </p>

              {/* Rating */}
              <div className="flex gap-1 mb-6">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[hsl(33_92%_66%)] text-[hsl(33_92%_66%)]" />
                ))}
              </div>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-[hsl(174_58%_56%)] flex items-center justify-center text-background font-bold text-sm rounded">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role} • {testimonial.location}</p>
                </div>
              </div>

              {/* Level progression */}
              <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase">Crecimiento</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-muted text-xs rounded">{testimonial.beforeLevel}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded">{testimonial.afterLevel}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
