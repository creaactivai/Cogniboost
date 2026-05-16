/**
 * Conversation Labs (Phase 1.6) — student-facing browse + book.
 *
 * Interest-driven design (Coral's spec):
 *   - Student picks an INTEREST chip ("Movies", "Sports", "Food"...)
 *   - Filtered list of upcoming sessions matching their LEVEL
 *   - Each session shows: title, scheduled time, instructor, spots left
 *   - "Reservar mi lugar" books a spot
 *   - "Mis Labs" section shows upcoming booked sessions
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Users, Sparkles, X } from "lucide-react";

interface InterestTopic {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  isActive: boolean;
  displayOrder: number | null;
}

interface LabSession {
  id: string;
  interestTopicId: string;
  level: string;
  title: string;
  description: string | null;
  grammarFocus: string | null;
  vocabulary: string[];
  expressions: string[];
  moduleReference: string | null;
  scheduledAt: string;
  durationMinutes: number;
  meetingUrl: string | null;
  maxParticipants: number;
  status: string;
  bookedCount?: number;            // derived server-side
  registrationId?: string;          // present on my-bookings response
}

export function ConversationLabsV2() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [interestFilter, setInterestFilter] = useState<string | "all">("all");

  // Student level — fallback to A1 if unknown
  const studentLevel = (user as any)?.currentLevel || (user as any)?.placementLevel || "A1";

  const { data: interests = [] } = useQuery<InterestTopic[]>({
    queryKey: ["/api/lab-interest-topics"],
  });
  const { data: upcoming = [] } = useQuery<LabSession[]>({
    queryKey: [`/api/lab-sessions/upcoming?level=${studentLevel}`],
  });
  const { data: myBookings = [] } = useQuery<LabSession[]>({
    queryKey: ["/api/lab-bookings/mine"],
  });

  const myBookedIds = new Set(myBookings.map((s) => s.id));

  const bookMutation = useMutation({
    mutationFn: async (labSessionId: string) => {
      const res = await fetch("/api/lab-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labSessionId }),
        credentials: "include",
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Booking failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "¡Reservaste tu lugar!", description: "Te llegará un recordatorio antes de la clase." });
      qc.invalidateQueries({ queryKey: ["/api/lab-bookings/mine"] });
      qc.invalidateQueries({ queryKey: [`/api/lab-sessions/upcoming?level=${studentLevel}`] });
    },
    onError: (err: any) => toast({ title: "No se pudo reservar", description: err?.message, variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      const res = await fetch(`/api/lab-bookings/${registrationId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Cancel failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Reserva cancelada" });
      qc.invalidateQueries({ queryKey: ["/api/lab-bookings/mine"] });
      qc.invalidateQueries({ queryKey: [`/api/lab-sessions/upcoming?level=${studentLevel}`] });
    },
  });

  // Filter upcoming sessions by selected interest
  const filtered = interestFilter === "all" ? upcoming : upcoming.filter((s) => s.interestTopicId === interestFilter);
  const interestById = new Map(interests.map((i) => [i.id, i]));

  return (
    <div className="container mx-auto p-4 space-y-6" data-testid="page-conversation-labs">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          Conversation Labs
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Find a live class at your level ({studentLevel}). Pick a topic that interests you and book a spot.
        </p>
      </div>

      <Tabs defaultValue="browse">
        <TabsList>
          <TabsTrigger value="browse" data-testid="tab-browse">Browse Labs</TabsTrigger>
          <TabsTrigger value="mine" data-testid="tab-mine">
            My Labs {myBookings.length > 0 && <Badge variant="default" className="ml-2">{myBookings.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {/* Interest chips */}
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Pick an interest</p>
            <div className="flex flex-wrap gap-2">
              <Chip selected={interestFilter === "all"} onClick={() => setInterestFilter("all")}>
                ✨ All
              </Chip>
              {interests.map((i) => (
                <Chip key={i.id} selected={interestFilter === i.id} onClick={() => setInterestFilter(i.id)}>
                  {i.icon} {i.name}
                </Chip>
              ))}
            </div>
          </div>

          {/* Sessions list */}
          {filtered.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No upcoming labs for {studentLevel}{interestFilter !== "all" && " in this interest"}. Check back soon!
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((s) => {
                const interest = interestById.get(s.interestTopicId);
                const isBooked = myBookedIds.has(s.id);
                const spotsLeft = s.maxParticipants - (s.bookedCount ?? 0);
                const isFull = spotsLeft <= 0;
                return (
                  <Card key={s.id} className="p-4 hover-elevate">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl flex-shrink-0">{interest?.icon ?? "📚"}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-bold text-sm">{s.title}</h3>
                          <Badge variant="outline" className="text-[10px]">{s.level}</Badge>
                          {interest && <Badge variant="secondary" className="text-[10px]">{interest.name}</Badge>}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(s.scheduledAt)}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(s.scheduledAt)} · {s.durationMinutes} min</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{s.bookedCount ?? 0}/{s.maxParticipants}</span>
                        </div>
                        {s.grammarFocus && (
                          <p className="text-xs mt-2"><strong>Focus:</strong> <span className="text-muted-foreground">{s.grammarFocus}</span></p>
                        )}
                        <div className="mt-3">
                          {isBooked ? (
                            <Badge variant="default" className="bg-green-600">✅ Reservado</Badge>
                          ) : isFull ? (
                            <Badge variant="secondary">Lleno</Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => bookMutation.mutate(s.id)}
                              disabled={bookMutation.isPending}
                              data-testid={`button-book-${s.id}`}
                            >
                              {bookMutation.isPending ? "Reservando…" : `📌 Reservar mi lugar (${spotsLeft} disponibles)`}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine" className="space-y-3">
          {myBookings.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              You haven't booked any labs yet. Browse upcoming labs and pick one!
            </Card>
          ) : (
            myBookings.map((s) => {
              const interest = interestById.get(s.interestTopicId);
              return (
                <Card key={s.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl flex-shrink-0">{interest?.icon ?? "📚"}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm mb-1">{s.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(s.scheduledAt)}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(s.scheduledAt)} · {s.durationMinutes} min</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {s.meetingUrl && (
                          <Button size="sm" asChild>
                            <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer">▶️ Entrar a la clase</a>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => s.registrationId && cancelMutation.mutate(s.registrationId)}
                          disabled={cancelMutation.isPending}
                        >
                          <X className="w-3 h-3 mr-1" /> Cancelar
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition ${
        selected ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" });
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es", { hour: "numeric", minute: "2-digit" });
}
