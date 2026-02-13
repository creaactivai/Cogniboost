import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";
import logoImage from "@assets/Frame_2_1768763364518.png";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error al procesar la solicitud");
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

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
            Recuperar Contraseña
          </h1>
          <p className="text-muted-foreground mt-2">
            Te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>

        <Card className="p-6">
          {success ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Revisa tu correo</h2>
              <p className="text-sm text-muted-foreground">
                Si existe una cuenta con <strong>{email}</strong>, recibirás un enlace para restablecer tu contraseña. Revisa también tu carpeta de spam.
              </p>
              <a href="/login">
                <Button variant="outline" className="mt-4">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver a iniciar sesión
                </Button>
              </a>
            </div>
          ) : (
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
                Enviar enlace de recuperación
              </Button>
            </form>
          )}
        </Card>

        {/* Back to Login */}
        <div className="text-center">
          <a
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            Volver a iniciar sesión
          </a>
        </div>
      </div>
    </div>
  );
}
