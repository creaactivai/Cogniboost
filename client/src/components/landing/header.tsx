import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

const navLinks = [
  { label: "How It Works", href: "#methodology" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isLoading, isAuthenticated } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2" data-testid="link-logo">
            <div className="w-8 h-8 bg-primary flex items-center justify-center">
              <span className="font-display text-primary-foreground text-sm">CB</span>
            </div>
            <span className="font-display text-xl uppercase tracking-tight">
              COGNI<span className="text-primary">BOOST</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
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
              <div className="w-20 h-9 bg-muted animate-pulse" />
            ) : isAuthenticated ? (
              <a href="/dashboard">
                <Button 
                  className="font-mono uppercase tracking-wider"
                  data-testid="button-dashboard"
                >
                  Dashboard
                </Button>
              </a>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <a href="/api/login">
                  <Button 
                    variant="ghost" 
                    className="font-mono uppercase tracking-wider"
                    data-testid="button-login"
                  >
                    Log In
                  </Button>
                </a>
                <a href="/api/login">
                  <Button 
                    className="bg-accent text-accent-foreground font-mono uppercase tracking-wider"
                    data-testid="button-signup"
                  >
                    Sign Up
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
                  className="text-sm font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              {!isAuthenticated && (
                <>
                  <hr className="border-border" />
                  <a href="/api/login">
                    <Button variant="outline" className="w-full font-mono uppercase tracking-wider">
                      Log In
                    </Button>
                  </a>
                  <a href="/api/login">
                    <Button className="w-full bg-accent text-accent-foreground font-mono uppercase tracking-wider">
                      Sign Up
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
