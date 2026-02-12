import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import logoImage from "@assets/Frame_2_1768763364518.png";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

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

        {/* OAuth Buttons */}
        <Card className="p-6 space-y-4">
          {/* Google Sign-In */}
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

          {/* Apple Sign-In */}
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

          {/* Replit Auth (fallback) */}
          <a href="/api/login" className="block">
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-center"
              data-testid="button-replit-signin"
            >
              Replit Auth
            </Button>
          </a>
        </Card>

        {/* Sign Up Link */}
        <p className="text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <a
            href="/auth/google"
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
