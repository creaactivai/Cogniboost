import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, Shield } from "lucide-react";

interface CheckoutLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  planPrice: string;
  planPeriod?: string;
  onSubmit: (email: string, name?: string) => Promise<void>;
}

export function CheckoutLeadModal({ 
  isOpen, 
  onClose, 
  planName, 
  planPrice,
  planPeriod = "/mes",
  onSubmit 
}: CheckoutLeadModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes("@")) {
      setError("Por favor ingresa un email válido");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(email, name || undefined);
    } catch (err: any) {
      setError(err.message || "Error al procesar. Intenta de nuevo.");
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setEmail("");
      setName("");
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Continuar al Pago
          </DialogTitle>
          <DialogDescription>
            Ingresa tu email para continuar con la suscripción al plan <strong>{planName}</strong> ({planPrice}{planPeriod})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="checkout-email">Email *</Label>
            <Input
              id="checkout-email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
              data-testid="input-checkout-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkout-name">Nombre (opcional)</Label>
            <Input
              id="checkout-name"
              type="text"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              data-testid="input-checkout-name"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Pago seguro procesado por Stripe. 7 días de prueba gratis.</span>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
              data-testid="button-checkout-cancel"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
              data-testid="button-checkout-continue"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                "Continuar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
