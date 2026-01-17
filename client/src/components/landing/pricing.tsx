import { Button } from "@/components/ui/button";
import { Check, X, Sparkles } from "lucide-react";

const plans = [
  {
    name: "FREE",
    price: "$0",
    period: "forever",
    description: "Perfect for exploring",
    features: [
      { text: "5 intro lessons", included: true },
      { text: "1 trial conversation lab", included: true },
      { text: "Basic progress tracking", included: true },
      { text: "Full course library", included: false },
      { text: "Monthly live labs", included: false },
      { text: "1-on-1 sessions", included: false },
      { text: "Certificates", included: false },
      { text: "Priority support", included: false },
    ],
    cta: "Get Started Free",
    variant: "outline" as const,
  },
  {
    name: "STANDARD",
    price: "$29",
    period: "/month",
    description: "Most popular choice",
    popular: true,
    features: [
      { text: "Full course library (100+)", included: true },
      { text: "4 conversation labs/month", included: true },
      { text: "Advanced progress tracking", included: true },
      { text: "Downloadable certificates", included: true },
      { text: "Email support", included: true },
      { text: "1-on-1 sessions", included: false },
      { text: "Priority support", included: false },
      { text: "Custom learning path", included: false },
    ],
    cta: "Start 7-Day Trial",
    variant: "default" as const,
  },
  {
    name: "PREMIUM",
    price: "$79",
    period: "/month",
    description: "For serious learners",
    features: [
      { text: "Everything in Standard", included: true },
      { text: "8 conversation labs/month", included: true },
      { text: "2 one-on-one sessions/month", included: true },
      { text: "Priority support", included: true },
      { text: "Custom learning path", included: true },
      { text: "Lab recordings (30 days)", included: true },
      { text: "LinkedIn certification", included: true },
      { text: "Early access to features", included: true },
    ],
    cta: "Start 7-Day Trial",
    variant: "default" as const,
    accent: true,
  },
];

export function Pricing() {
  return (
    <section className="py-32 bg-background" id="pricing">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-20">
          <p className="text-sm font-mono text-primary uppercase tracking-widest mb-4">PRICING</p>
          <h2 className="text-4xl md:text-6xl font-display uppercase mb-6">
            FLEXIBLE <span className="text-accent">PLANS</span>
            <br />
            FOR EVERY LEARNER
          </h2>
          <p className="text-lg text-muted-foreground font-mono max-w-2xl mx-auto">
            Choose the plan that fits your learning goals. Upgrade, downgrade, or cancel anytime.
          </p>
        </div>

        {/* Pricing grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div 
              key={plan.name}
              className={`relative p-8 border ${plan.popular ? "border-primary" : "border-border"} ${plan.accent ? "bg-foreground text-background" : "bg-card"}`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-mono uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  POPULAR
                </div>
              )}

              {/* Plan header */}
              <div className="mb-8">
                <p className="text-sm font-mono uppercase tracking-wider opacity-60 mb-2">{plan.name}</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-5xl font-display">{plan.price}</span>
                  <span className="text-sm font-mono opacity-60">{plan.period}</span>
                </div>
                <p className="text-sm font-mono opacity-60">{plan.description}</p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className={`w-4 h-4 flex-shrink-0 ${plan.accent ? "text-primary" : "text-primary"}`} />
                    ) : (
                      <X className="w-4 h-4 flex-shrink-0 opacity-30" />
                    )}
                    <span className={`text-sm font-mono ${!feature.included && "opacity-40"}`}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button 
                className={`w-full font-mono uppercase tracking-wider ${plan.accent ? "bg-accent text-accent-foreground" : plan.variant === "default" ? "bg-primary text-primary-foreground" : ""}`}
                variant={plan.variant}
                data-testid={`button-plan-${plan.name.toLowerCase()}`}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        {/* Trust indicators */}
        <div className="flex flex-wrap justify-center gap-8 mt-16 text-sm font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            <span>No credit card required</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            <span>Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            <span>7-day money back guarantee</span>
          </div>
        </div>
      </div>
    </section>
  );
}
