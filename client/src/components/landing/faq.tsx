import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How is CogniBoost different from Duolingo or Babbel?",
    answer: "Unlike app-based learning that focuses on gamified exercises, CogniBoost combines structured courses with live conversation practice. You'll spend 30+ minutes speaking English in our labs, compared to the few minutes of voice exercises in typical apps. Our methodology is designed for adult professionals who need real-world fluency, not just vocabulary memorization.",
  },
  {
    question: "What if I'm too shy to speak in groups?",
    answer: "We understand this concern! Our labs are designed to be supportive, not intimidating. You practice with peers at your same level, not with advanced speakers. Breakout rooms have only 3-4 people, so it feels like chatting with friends. Plus, everyone there has the same goal—to improve through practice. Most shy students tell us they love the labs after their first session!",
  },
  {
    question: "Are the conversation labs recorded?",
    answer: "Privacy is important to us. Standard plan labs are not recorded. Premium members get access to recordings of their sessions for 30 days for personal review only. All recordings are private and never shared publicly.",
  },
  {
    question: "Can I change my subscription level?",
    answer: "Absolutely! You can upgrade or downgrade your plan at any time. Upgrades take effect immediately, and you'll be credited for the unused portion of your current plan. Downgrades take effect at the end of your current billing period.",
  },
  {
    question: "Do you offer official certificates?",
    answer: "Yes! Standard and Premium members receive digital certificates upon completing courses and reaching new levels. These certificates include verification links and can be shared on LinkedIn or added to your resume. While not equivalent to official exams like TOEFL, they demonstrate your commitment to learning.",
  },
  {
    question: "What topics are covered in conversation labs?",
    answer: "We offer 20+ topic categories including Business English, Technology, Travel, Culture & Arts, Healthcare, Finance, and everyday conversations. You select your preferred topics when booking a lab, and we group you with others who share your interests.",
  },
  {
    question: "How do I know which level is right for me?",
    answer: "When you sign up, you'll take a quick assessment that evaluates your reading, listening, and speaking abilities. Based on your results, we recommend your starting level (A1 to C2). You can always adjust if you feel the level isn't right.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards worldwide. For Latin American users, we also support local payment methods through MercadoPago, including PIX in Brazil, Boleto Bancário, and local debit cards in Mexico, Argentina, and Colombia.",
  },
];

export function FAQ() {
  return (
    <section className="py-32 bg-background">
      <div className="container mx-auto px-6 max-w-4xl">
        {/* Section header */}
        <div className="text-center mb-20">
          <p className="text-sm font-mono text-primary uppercase tracking-widest mb-4">FAQ</p>
          <h2 className="text-4xl md:text-6xl font-display uppercase mb-6">
            COMMON
            <br />
            <span className="text-accent">QUESTIONS</span>
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
