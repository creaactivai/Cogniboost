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

type Step = "form" | "calendar" | "confirm";

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
  const [step, setStep] = useState<Step>("form");
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [selectedSession, setSelectedSession] = useState<LabSessionPublic | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const { data: sessions, isLoading: loadingSessions } = useQuery<LabSessionPublic[]>({
    queryKey: ["/api/lab-sessions/upcoming/public"],
    enabled: isOpen && step === "calendar",
  });

  const createLeadMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; phone?: string }) => {
      const nameParts = data.name.trim().split(/\s+/);
      const firstName = nameParts[0] || data.name;
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

      const payload: Record<string, string | undefined> = {
        email: data.email,
        firstName,
      };

      if (lastName) {
        payload.lastName = lastName;
      }
      if (data.phone && data.phone.trim()) {
        payload.phone = data.phone.trim();
      }

      return apiRequest("POST", "/api/leads", payload);
    },
    onSuccess: () => {
      setStep("calendar");
    },
    onError: (error: any) => {
      if (error?.message?.includes("already exists")) {
        setStep("calendar");
      } else {
        toast({
          title: "Error",
          description: "No pudimos guardar tu información. Intenta de nuevo.",
          variant: "destructive",
        });
      }
    },
  });

  const bookMutation = useMutation({
    mutationFn: async (labSessionId: string) => {
      if (isAuthenticated) {
        // Logged-in users book through the regular (tier-checked) endpoint.
        return apiRequest("POST", "/api/lab-bookings", { labSessionId });
      }
      // Guests book through the no-account endpoint with their form data.
      return apiRequest("POST", "/api/lab-bookings/guest", {
        labSessionId,
        email: formData.email,
        name: formData.name,
        phone: formData.phone || undefined,
      });
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
      toast({ title: "Error", description, variant: "destructive" });
    },
  });

  const resetModal = () => {
    setStep("form");
    setFormData({ name: "", email: "", phone: "" });
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast({
        title: "Campos requeridos",
        description: "Por favor ingresa tu nombre y email.",
        variant: "destructive",
      });
      return;
    }
    createLeadMutation.mutate(formData);
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
              {step === "form" && "Reserva tu Clase Gratis"}
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
          {step === "form" && (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Ingresa tus datos para reservar tu clase gratuita con uno de nuestros expertos.
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
                <Label htmlFor="phone">Teléfono (opcional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+52 55 1234 5678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  data-testid="input-booking-phone"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createLeadMutation.isPending}
                data-testid="button-booking-continue"
              >
                {createLeadMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Ver Clases Disponibles
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
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

              <Button
                variant="outline"
                onClick={() => setStep("form")}
                className="w-full"
              >
                Volver
              </Button>
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
