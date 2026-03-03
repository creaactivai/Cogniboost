import { Helmet } from "react-helmet-async";
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
    <>
      <Helmet>
        <title>CogniBoost - Aprende Inglés Profesional | Clases para Hispanohablantes</title>
        <meta name="description" content="Aprende inglés profesional con la metodología Class Labs. Clases en vivo, laboratorios de conversación y cursos diseñados para hispanohablantes que quieren avanzar en sus carreras. 250+ lecciones, 87% tasa de completación." />
        <link rel="canonical" href="https://cogniboost.co/" />
      </Helmet>
      <Header />
      <div className="min-h-screen page-transition">
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
    </>
  );
}
