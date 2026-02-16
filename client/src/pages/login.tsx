import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import logoImage from "@assets/Frame_2_1768763364518.png";
import { trackLogin } from "@/lib/analytics";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error al iniciar sesión");
        return;
      }

      trackLogin("email");
      // If there's a pending Stripe purchase, redirect to complete linking
      const pendingStripe = localStorage.getItem("pending_stripe_customer");
      if (pendingStripe) {
        window.location.href = "/purchase-complete";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <a href="/" className="inline-block mb-4">
            <img
              src={logoImage}
              alt="CogniBoost"
              className="h-12 w-auto mx-auto"
            />
          </a>
          <h1 className="text-3xl font-bold tracking-tight">
            Iniciar Sesión
          </h1>
          <p className="text-muted-foreground mt-2">
            Continúa tu camino de aprendizaje
          </p>
        </div>

        {/* Login Form */}
        <Card className="p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <a
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Iniciar Sesión
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                O continuar con
              </span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3">
            <a href="/auth/google" className="block">
              <Button
                variant="outline"
                size="lg"
                className="w-full justify-center gap-3"
                data-testid="button-google-signin"
              >
                <FcGoogle className="w-5 h-5" />
                <span>Continuar con Google</span>
              </Button>
            </a>

            <a href="/auth/apple" className="block">
              <Button
                variant="outline"
                size="lg"
                className="w-full justify-center gap-3"
                data-testid="button-apple-signin"
              >
                <FaApple className="w-5 h-5" />
                <span>Continuar con Apple</span>
              </Button>
            </a>
          </div>
        </Card>

        {/* Sign Up Link */}
        <p className="text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <a
            href="/signup"
            className="font-medium text-primary hover:underline"
          >
            Crear cuenta gratis
          </a>
        </p>

        {/* Back to Home */}
        <div className="text-center">
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}
