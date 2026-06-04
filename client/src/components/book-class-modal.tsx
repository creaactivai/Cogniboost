import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, Clock, Users, X, ChevronRight, Loader2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { trackBookingSubmitted } from "@/lib/analytics";
import { useAuth } from "@/hooks/use-auth";

interface BookClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement>;
  bookingType?: 'class' | 'demo';
}

type Step = "signup" | "calendar" | "confirm";

// Shape returned by GET /api/lab-sessions/upcoming/public — a real
// Conversation Lab (lab_sessions), with live seat counts.
interface LabSessionPublic {
  id: string;
  title: string;
  description?: string;
  level: string;
  scheduledAt: string;
  durationMinutes: number;
  maxParticipants: number;
  bookedCount: number;
  seatsLeft: number;
}

export function BookClassModal({ isOpen, onClose, triggerRef, bookingType = 'class' }: BookClassModalProps) {
  const [step, setStep] = useState<Step>("signup");
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [selectedSession, setSelectedSession] = useState<LabSessionPublic | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Logged-in visitors skip the signup step and go straight to picking a class.
  useEffect(() => {
    if (isOpen) {
      setStep(isAuthenticated ? "calendar" : "signup");
    }
  }, [isOpen, isAuthenticated]);

  const { data: sessions, isLoading: loadingSessions } = useQuery<LabSessionPublic[]>({
    queryKey: ["/api/lab-sessions/upcoming/public"],
    enabled: isOpen && step === "calendar",
  });

  // Create a FREE account (and log in) so the booking is tied to a real user.
  const signupMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string }) => {
      const nameParts = data.name.trim().split(/\s+/);
      const firstName = nameParts[0] || data.name;
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;
      return apiRequest("POST", "/api/auth/signup", {
        email: data.email,
        password: data.password,
        firstName,
        lastName,
      });
    },
    onSuccess: async () => {
      // Refresh auth state so the booking call is authenticated.
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setStep("calendar");
    },
    onError: (error: any) => {
      const msg = error?.message || "";
      if (msg.includes("Ya existe") || msg.includes("already exists") || msg.includes("409")) {
        toast({
          title: "Ya tienes una cuenta",
          description: "Ese correo ya está registrado. Inicia sesión para reservar tu clase.",
        });
      } else if (msg.includes("8 caracteres") || msg.includes("password")) {
        toast({
          title: "Contraseña muy corta",
          description: "La contraseña debe tener al menos 8 caracteres.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "No pudimos crear tu cuenta. Intenta de nuevo.",
          variant: "destructive",
        });
      }
    },
  });

  const bookMutation = useMutation({
    mutationFn: async (labSessionId: string) => {
      return apiRequest("POST", "/api/lab-bookings", { labSessionId });
    },
    onSuccess: () => {
      trackBookingSubmitted(bookingType);
      toast({
        title: "Clase Reservada",
        description: "Tu clase ha sido reservada exitosamente. Revisa tu correo para la confirmación.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lab-sessions/upcoming/public"] });
      onClose();
      resetModal();
    },
    onError: (error: any) => {
      const msg = error?.message || "";
      let description = "No pudimos reservar la clase. Intenta de nuevo.";
      if (msg.includes("full")) description = "Esta clase ya está llena. Elige otra fecha.";
      else if (msg.includes("already started")) description = "Esta clase ya comenzó. Elige otra fecha.";
      else if (msg.includes("Free trial used")) description = "Ya usaste tu clase de prueba gratis. Pasa a un plan para reservar más.";
      else if (msg.includes("Already registered")) description = "Ya estás registrado en esta clase.";
      toast({ title: "Error", description, variant: "destructive" });
    },
  });

  const resetModal = () => {
    setStep(isAuthenticated ? "calendar" : "signup");
    setFormData({ name: "", email: "", password: "" });
    setSelectedSession(null);
  };

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      toast({
        title: "Campos requeridos",
        description: "Ingresa tu nombre, correo y una contraseña.",
        variant: "destructive",
      });
      return;
    }
    if (formData.password.length < 8) {
      toast({
        title: "Contraseña muy corta",
        description: "La contraseña debe tener al menos 8 caracteres.",
        variant: "destructive",
      });
      return;
    }
    signupMutation.mutate(formData);
  };

  const handleSessionSelect = (session: LabSessionPublic) => {
    setSelectedSession(session);
    setStep("confirm");
  };

  const handleBooking = () => {
    if (selectedSession) {
      bookMutation.mutate(selectedSession.id);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={modalRef}
        className={`relative bg-card border border-border rounded-md shadow-lg w-full max-w-lg mx-4 overflow-hidden transition-all duration-500 ease-out ${
          isAnimating ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">
              {step === "signup" && "Crea tu cuenta gratis"}
              {step === "calendar" && "Selecciona una Fecha"}
              {step === "confirm" && "Confirmar Reserva"}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { onClose(); resetModal(); }}
            data-testid="modal-close"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6">
          {step === "signup" && (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Crea tu cuenta gratis para reservar tu <strong>primera clase de prueba</strong>. Toma 30 segundos.
              </p>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  placeholder="Tu nombre"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-booking-name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  data-testid="input-booking-email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  data-testid="input-booking-password"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={signupMutation.isPending}
                data-testid="button-booking-continue"
              >
                {signupMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Crear cuenta y ver clases
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                ¿Ya tienes cuenta?{" "}
                <a href="/login" className="text-primary hover:underline font-medium">
                  Inicia sesión
                </a>
              </p>
            </form>
          )}

          {step === "calendar" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecciona una clase de las disponibles:
              </p>

              {loadingSessions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : sessions && sessions.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {sessions.map((session) => {
                    const full = session.seatsLeft <= 0;
                    return (
                      <Card
                        key={session.id}
                        className={`transition-all ${full ? "opacity-50" : "cursor-pointer hover-elevate"}`}
                        onClick={() => { if (!full) handleSessionSelect(session); }}
                        data-testid={`session-card-${session.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-medium">{session.title}</h3>
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {formatDate(session.scheduledAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {formatTime(session.scheduledAt)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <GraduationCap className="w-3 h-3" />
                                  {session.level}
                                </Badge>
                                <Badge variant="secondary">{session.durationMinutes} min</Badge>
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Users className="w-3 h-3" />
                                  {full ? "Llena" : `${session.seatsLeft} cupos`}
                                </span>
                              </div>
                            </div>
                            {!full && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No hay clases disponibles en este momento.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Te notificaremos cuando haya nuevas clases.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === "confirm" && selectedSession && (
            <div className="space-y-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg">{selectedSession.title}</h3>
                  {selectedSession.description && (
                    <p className="text-sm text-muted-foreground mt-1">{selectedSession.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(selectedSession.scheduledAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatTime(selectedSession.scheduledAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      Nivel {selectedSession.level}
                    </Badge>
                    <Badge variant="secondary">{selectedSession.durationMinutes} min</Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" />
                      {selectedSession.seatsLeft} cupos disponibles
                    </span>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedSession(null);
                    setStep("calendar");
                  }}
                  className="flex-1"
                >
                  Volver
                </Button>
                <Button
                  onClick={handleBooking}
                  disabled={bookMutation.isPending}
                  className="flex-1"
                  data-testid="button-confirm-booking"
                >
                  {bookMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Confirmar Reserva
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
