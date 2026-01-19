import { SiLinkedin, SiInstagram, SiYoutube, SiX, SiTiktok, SiWhatsapp } from "react-icons/si";
import logoImage from "@assets/Frame_2_1768763364518.png";

const footerLinks = {
  product: [
    { label: "Características", href: "#methodology" },
    { label: "Precios", href: "#pricing" },
    { label: "Preguntas Frecuentes", href: "#faq" },
    { label: "Historias de Éxito", href: "#testimonials" },
  ],
  company: [
    { label: "Sobre Nosotros", href: "/sobre-nosotros" },
    { label: "Trabaja con Nosotros", href: "mailto:jobs@cognimight.com" },
    { label: "Contacto", href: "mailto:info@cognimight.com" },
  ],
  legal: [
    { label: "Política de Privacidad", href: "/legal#privacidad" },
    { label: "Términos de Servicio", href: "/legal#terminos" },
    { label: "Política de Cookies", href: "/legal#cookies" },
  ],
};

const socialLinks = [
  { icon: SiWhatsapp, href: "https://chat.whatsapp.com/DKAjOGcbzjsJUzg9R7dTHJ", label: "WhatsApp" },
  { icon: SiLinkedin, href: "#", label: "LinkedIn" },
  { icon: SiInstagram, href: "#", label: "Instagram" },
  { icon: SiYoutube, href: "#", label: "YouTube" },
  { icon: SiTiktok, href: "#", label: "TikTok" },
  { icon: SiX, href: "#", label: "X" },
];

export function Footer() {
  return (
    <footer className="py-20 bg-card border-t border-border">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center mb-6">
              <img 
                src={logoImage} 
                alt="CogniBoost" 
                className="h-8 w-auto"
              />
            </div>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Educación orientada a resultados para profesionales hispanohablantes. 
              Habilidades prácticas, expertos de la industria, resultados profesionales reales.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-10 h-10 border border-border flex items-center justify-center hover:bg-muted transition-colors rounded"
                  aria-label={social.label}
                  data-testid={`link-social-${social.label.toLowerCase()}`}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest mb-6">Producto</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest mb-6">Empresa</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest mb-6">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} CogniBoost. Todos los derechos reservados. By <a href="https://creaactiva.co" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Creaactiva.co</a>
          </p>
          <p className="text-sm text-muted-foreground">
            Eleva Tu Potencial
          </p>
        </div>
      </div>
    </footer>
  );
}
