import { SiLinkedin, SiInstagram, SiYoutube, SiX } from "react-icons/si";

const footerLinks = {
  product: [
    { label: "Features", href: "#methodology" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
    { label: "Success Stories", href: "#testimonials" },
  ],
  company: [
    { label: "About Us", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Contact", href: "#" },
  ],
  legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
};

const socialLinks = [
  { icon: SiLinkedin, href: "#", label: "LinkedIn" },
  { icon: SiInstagram, href: "#", label: "Instagram" },
  { icon: SiYoutube, href: "#", label: "YouTube" },
  { icon: SiX, href: "#", label: "X" },
];

export function Footer() {
  return (
    <footer className="py-20 bg-card border-t border-border">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-primary flex items-center justify-center">
                <span className="font-display text-primary-foreground text-sm">CB</span>
              </div>
              <span className="font-display text-xl uppercase tracking-tight">
                COGNI<span className="text-primary">BOOST</span>
              </span>
            </div>
            <p className="font-mono text-sm text-muted-foreground mb-6 max-w-sm">
              Master English through real conversations. Pre-recorded courses + live practice 
              labs designed for Latin American professionals.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-10 h-10 border border-border flex items-center justify-center hover:bg-muted transition-colors"
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
            <h4 className="font-mono text-sm uppercase tracking-widest mb-6">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href}
                    className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h4 className="font-mono text-sm uppercase tracking-widest mb-6">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href}
                    className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="font-mono text-sm uppercase tracking-widest mb-6">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href}
                    className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
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
          <p className="font-mono text-sm text-muted-foreground">
            © {new Date().getFullYear()} CogniBoost. All rights reserved.
          </p>
          <p className="font-mono text-sm text-muted-foreground">
            Made with ❤️ for Latin America
          </p>
        </div>
      </div>
    </footer>
  );
}
