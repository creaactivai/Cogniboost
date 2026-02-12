import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import logoImage from "@assets/Frame_2_1768763364518.png";

const navLinks = [
  { label: "Cómo Funciona", href: "#methodology" },
  { label: "Precios", href: "#pricing" },
  { label: "Preguntas", href: "#faq" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isLoading, isAuthenticated } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center" data-testid="link-logo">
            <img 
              src={logoImage} 
              alt="CogniBoost" 
              className="h-8 w-auto"
            />
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                data-testid={`link-nav-${link.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            
            {isLoading ? (
              <div className="w-20 h-9 bg-muted animate-pulse rounded" />
            ) : isAuthenticated ? (
              <a href="/dashboard">
                <Button 
                  data-testid="button-dashboard"
                >
                  Mi Panel
                </Button>
              </a>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <a href="/login">
                  <Button
                    variant="ghost"
                    data-testid="button-login"
                  >
                    Iniciar Sesión
                  </Button>
                </a>
                <a href="/login">
                  <Button
                    data-testid="button-signup"
                  >
                    Crear cuenta gratis
                  </Button>
                </a>
              </div>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              {!isAuthenticated && (
                <>
                  <hr className="border-border" />
                  <a href="/login">
                    <Button variant="outline" className="w-full">
                      Iniciar Sesión
                    </Button>
                  </a>
                  <a href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full">
                      Crear cuenta gratis
                    </Button>
                  </a>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
