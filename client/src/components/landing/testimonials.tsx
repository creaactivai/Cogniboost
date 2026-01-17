import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    name: "Maria Garcia",
    role: "Marketing Manager",
    location: "Mexico City",
    quote: "After 3 months with CogniBoost, I finally feel confident speaking English in meetings. The conversation labs changed everything.",
    rating: 5,
    beforeLevel: "A2",
    afterLevel: "B2",
    avatar: "MG",
  },
  {
    name: "Carlos Rodriguez",
    role: "Software Engineer",
    location: "São Paulo",
    quote: "The flexibility to learn at my own pace combined with real practice sessions is exactly what I needed. No more textbook-only learning.",
    rating: 5,
    beforeLevel: "B1",
    afterLevel: "C1",
    avatar: "CR",
  },
  {
    name: "Ana Silva",
    role: "HR Director",
    location: "Bogotá",
    quote: "I tried many apps before. CogniBoost is the first one where I actually speak more than I read. The peer practice removes all the pressure.",
    rating: 5,
    beforeLevel: "A2",
    afterLevel: "B1",
    avatar: "AS",
  },
  {
    name: "Diego Fernandez",
    role: "Sales Executive",
    location: "Buenos Aires",
    quote: "The business English courses are incredibly practical. I use what I learn immediately in my daily work with international clients.",
    rating: 5,
    beforeLevel: "B1",
    afterLevel: "B2",
    avatar: "DF",
  },
  {
    name: "Lucia Morales",
    role: "University Student",
    location: "Lima",
    quote: "The conversation labs are so much fun! I never thought I'd enjoy speaking English. Now I look forward to every session.",
    rating: 5,
    beforeLevel: "A1",
    afterLevel: "B1",
    avatar: "LM",
  },
  {
    name: "Roberto Costa",
    role: "Entrepreneur",
    location: "Rio de Janeiro",
    quote: "From barely understanding English to negotiating in it. The structured approach and live practice made all the difference.",
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
          <p className="text-sm font-mono text-accent uppercase tracking-widest mb-4">SUCCESS STORIES</p>
          <h2 className="text-4xl md:text-6xl font-display uppercase mb-6">
            REAL <span className="text-primary">RESULTS</span>
            <br />
            FROM REAL LEARNERS
          </h2>
        </div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="p-8 bg-background border border-border hover-elevate group"
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
                <span className="text-xs font-mono text-muted-foreground uppercase">Progress</span>
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
