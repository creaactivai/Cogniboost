import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Methodology, ConversationLabsDeepDive } from "@/components/landing/methodology";
import { Pricing } from "@/components/landing/pricing";
import { Testimonials } from "@/components/landing/testimonials";
import { FAQ } from "@/components/landing/faq";
import { FinalCTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";
import { AnimatedSection } from "@/hooks/use-scroll-animation";

export default function LandingPage() {
  return (
    <div className="min-h-screen page-transition">
      <Header />
      <main className="pt-16">
        <Hero />
        <AnimatedSection animation="fade-up">
          <section id="methodology">
            <Methodology />
          </section>
        </AnimatedSection>
        <AnimatedSection animation="fade-up" delay={100}>
          <ConversationLabsDeepDive />
        </AnimatedSection>
        <AnimatedSection animation="fade-up" delay={100}>
          <Testimonials />
        </AnimatedSection>
        <AnimatedSection animation="fade-up" delay={100}>
          <Pricing />
        </AnimatedSection>
        <AnimatedSection animation="fade-up" delay={100}>
          <section id="faq">
            <FAQ />
          </section>
        </AnimatedSection>
        <AnimatedSection animation="scale-up" delay={100}>
          <FinalCTA />
        </AnimatedSection>
      </main>
      <Footer />
    </div>
  );
}
