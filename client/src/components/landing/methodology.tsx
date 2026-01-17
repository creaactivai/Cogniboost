import { Play, Users, TrendingUp, Sparkles } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Play,
    title: "LEARN AT YOUR PACE",
    description: "Study with pre-recorded courses (A1-C2 levels) covering grammar, vocabulary, and real-world scenarios. Watch anytime, anywhere.",
    color: "primary",
  },
  {
    number: "02",
    icon: Users,
    title: "PRACTICE LIVE CONVERSATIONS",
    description: "Join Conversation Practice Labs: small-group sessions where you discuss topics you care about with peers at your level.",
    color: "accent",
    badge: "REVOLUTIONARY METHOD",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "TRACK YOUR PROGRESS",
    description: "Monitor your improvement, earn certificates, and advance through levels with detailed analytics and personalized recommendations.",
    color: "primary",
  },
];

export function Methodology() {
  return (
    <section className="py-32 bg-card border-y border-border">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-20">
          <p className="text-sm font-mono text-primary uppercase tracking-widest mb-4">HOW IT WORKS</p>
          <h2 className="text-4xl md:text-6xl font-display uppercase mb-6">
            LEARN <span className="text-primary">→</span> PRACTICE <span className="text-accent">→</span> MASTER
          </h2>
          <p className="text-lg text-muted-foreground font-mono max-w-2xl mx-auto">
            Our proven three-step methodology helps you achieve real fluency in English, 
            combining self-paced learning with live practice.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div 
              key={step.number}
              className="relative p-8 bg-background border border-border hover-elevate group"
            >
              {/* Badge */}
              {step.badge && (
                <div className="absolute -top-3 left-8 px-3 py-1 bg-accent text-accent-foreground text-xs font-mono uppercase tracking-wider">
                  {step.badge}
                </div>
              )}

              {/* Step number */}
              <p className={`text-8xl font-display opacity-10 absolute top-4 right-4 ${step.color === "accent" ? "text-accent" : "text-primary"}`}>
                {step.number}
              </p>

              {/* Icon */}
              <div className={`w-16 h-16 flex items-center justify-center mb-6 ${step.color === "accent" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}`}>
                <step.icon className="w-8 h-8" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-display uppercase mb-4">{step.title}</h3>
              <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                {step.description}
              </p>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-border z-10" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ConversationLabsDeepDive() {
  const benefits = [
    {
      stat: "7x",
      label: "MORE TALK TIME",
      description: "More speaking practice than traditional classes",
    },
    {
      stat: "3-4",
      label: "PEERS PER GROUP",
      description: "Practice with peers, not under teacher spotlight",
    },
    {
      stat: "20+",
      label: "TOPIC CATEGORIES",
      description: "Choose topics from business to travel to tech",
    },
    {
      stat: "30+",
      label: "MINUTES SPEAKING",
      description: "Natural dialogue, not artificial exercises",
    },
  ];

  return (
    <section className="py-32 bg-foreground text-background">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-mono uppercase tracking-widest text-primary">Featured</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-display uppercase">
              CONVERSATION
              <br />
              PRACTICE
              <br />
              <span className="text-accent">LABS</span>
            </h2>

            <p className="text-lg font-mono opacity-80 leading-relaxed">
              Traditional classes give you 5 minutes of speaking time. Our labs give you 30+. 
              After a quick intro where instructors teach key phrases and vocabulary, you join 
              breakout rooms with 3-4 peers who share your interests.
            </p>

            <p className="text-lg font-mono opacity-80 leading-relaxed">
              Discuss business, travel, tech, culture—topics that matter to YOU. Our facilitators 
              rotate through rooms, providing feedback and keeping conversations flowing naturally.
            </p>
          </div>

          {/* Right content - Benefits grid */}
          <div className="grid grid-cols-2 gap-4">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="p-6 border border-background/20 hover:border-primary/50 transition-colors"
              >
                <p className="text-5xl font-display text-primary mb-2">{benefit.stat}</p>
                <p className="text-sm font-mono uppercase tracking-wider mb-2">{benefit.label}</p>
                <p className="text-xs font-mono opacity-60">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
