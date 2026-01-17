import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Methodology, ConversationLabsDeepDive } from "@/components/landing/methodology";
import { Pricing } from "@/components/landing/pricing";
import { Testimonials } from "@/components/landing/testimonials";
import { FAQ } from "@/components/landing/faq";
import { FinalCTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <Hero />
        <section id="methodology">
          <Methodology />
        </section>
        <ConversationLabsDeepDive />
        <Testimonials />
        <Pricing />
        <section id="faq">
          <FAQ />
        </section>
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
