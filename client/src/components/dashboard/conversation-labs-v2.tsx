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
import { Calendar, Clock, Users, Sparkles, X, Crown, Lock, BarChart3, Bookmark, CheckCircle2, Radio } from "lucide-react";
import { InterestIcon } from "@/components/lab/interest-icon";
import { DailyChallengeWidget } from "@/components/dashboard/daily-challenge-widget";
import { canAccessLabs, getTierLimits, getStartOfCurrentWeek, getStartOfCurrentMonth, type SubscriptionTier } from "@/lib/tier-access";
import { Link } from "wouter";

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
  liveStatus?: "live" | "starting_soon" | "upcoming";
  registrationId?: string;          // present on my-bookings response
}

export function ConversationLabsV2() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [interestFilter, setInterestFilter] = useState<string | "all">("all");

  // Student level — fallback to A1 if unknown
  const studentLevel = (user as any)?.currentLevel || (user as any)?.placementLevel || "A1";
  const tier = ((user as any)?.subscriptionTier || "free") as SubscriptionTier;
  const tierLimits = getTierLimits(tier);
  const hasAccess = canAccessLabs(tier);

  // Free tier gets ONE lifetime trial Lab (the "first free class"). Ask the
  // server whether this account still has it available, so free users can
  // actually browse + book it from the dashboard instead of hitting a wall.
  const { data: trialStatus } = useQuery<{ hasLabsAccess: boolean; trialUsed: boolean; canBookTrial: boolean }>({
    queryKey: ["/api/lab-bookings/trial-status"],
    enabled: !hasAccess,
  });
  const canBookTrial = !hasAccess && !!trialStatus?.canBookTrial;
  const trialUsed = !hasAccess && !!trialStatus?.trialUsed;

  // Students SEE every level's classes, but can only BOOK their level ±1
  // (Challenge = one up, Refresh = one down) — matches the server rule.
  // Free-trial users can book any level (their single trial). Out-of-range
  // cards show "Not your level" instead of a Book button that would fail.
  const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const studentIdx = LEVELS.indexOf(studentLevel);
  const canBookLevel = (lvl: string) => {
    if (canBookTrial) return true;
    const i = LEVELS.indexOf(lvl);
    return studentIdx >= 0 && i >= 0 && Math.abs(i - studentIdx) <= 1;
  };

  const { data: interests = [] } = useQuery<InterestTopic[]>({
    queryKey: ["/api/lab-interest-topics"],
    enabled: hasAccess || canBookTrial,
  });
  const { data: upcoming = [] } = useQuery<LabSession[]>({
    queryKey: [`/api/lab-sessions/upcoming?level=all`],
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
      toast({ title: "Spot reserved!", description: "You'll get a reminder before class starts." });
      qc.invalidateQueries({ queryKey: ["/api/lab-bookings/mine"] });
      qc.invalidateQueries({ queryKey: ["/api/lab-bookings/trial-status"] });
      qc.invalidateQueries({ queryKey: [`/api/lab-sessions/upcoming?level=all`] });
    },
    onError: (err: any) => {
      const msg = err?.message || "";
      const description = msg.includes("Free trial used")
        ? "Ya usaste tu clase de prueba gratis. Pasa a un plan para reservar más."
        : msg;
      toast({ title: "Couldn't book", description, variant: "destructive" });
    },
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
      toast({ title: "Booking cancelled" });
      qc.invalidateQueries({ queryKey: ["/api/lab-bookings/mine"] });
      qc.invalidateQueries({ queryKey: [`/api/lab-sessions/upcoming?level=all`] });
    },
  });

  // Filter upcoming sessions by selected interest
  const filtered = interestFilter === "all" ? upcoming : upcoming.filter((s) => s.interestTopicId === interestFilter);
  const interestById = new Map(interests.map((i) => [i.id, i]));

  // Compute student's current period usage (best-effort client-side; server is
  // source of truth for booking enforcement).
  const weekStart = getStartOfCurrentWeek();
  const monthStart = getStartOfCurrentMonth();
  const weeklyUsed = myBookings.filter((s) => new Date(s.scheduledAt) >= weekStart).length;
  const monthlyUsed = myBookings.filter((s) => new Date(s.scheduledAt) >= monthStart).length;

  const tierLabel =
    tier === "premium" ? "Premium" : tier === "basic" ? "Basic" : tier === "flex" ? "Flex" : "Free";
  const quotaText = !hasAccess
    ? (canBookTrial ? "1 clase de prueba gratis" : "Prueba usada")
    : tierLimits.weeklyLabLimit !== null
      ? `${weeklyUsed}/${tierLimits.weeklyLabLimit} this week`
      : tierLimits.monthlyLabLimit !== null
      ? `${monthlyUsed}/${tierLimits.monthlyLabLimit} this month`
      : "Unlimited";

  // Gate: only free users who have ALREADY used their trial AND have no
  // upcoming booking see the upgrade wall. Free users with a trial still
  // available (canBookTrial) get the full browse + book experience below.
  if (!hasAccess && !canBookTrial && myBookings.length === 0) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Conversation Labs
          </h1>
        </div>
        <Card className="p-8 text-center space-y-4">
          <Lock className="w-12 h-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-bold">
            {trialUsed ? "Ya usaste tu clase de prueba gratis" : "Conversation Labs require a paid plan"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {trialUsed ? (
              "Pasa a un plan para seguir practicando en vivo con maestros y otros estudiantes de tu nivel. Desde el Plan Flex ($14.99/mes — 1 Lab al mes)."
            ) : (
              <>Practice English live with teachers and other students at your level. Available from the <strong>Flex Plan</strong> ($14.99/mo — 1 Lab per month).</>
            )}
          </p>
          <Button asChild>
            <Link href="/choose-plan">View plans & pricing</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6" data-testid="page-conversation-labs">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Conversation Labs
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            All upcoming live classes are shown — each one is labelled with its level. Your level is {studentLevel}. Pick a topic and book a spot.
          </p>
        </div>
        {/* Plan + quota badge */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30">
          {tier === "premium" && <Crown className="w-4 h-4 text-amber-500" />}
          <div>
            <div className="text-xs font-mono uppercase text-muted-foreground">Your plan: {tierLabel}</div>
            <div className="text-sm font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4" /> {quotaText}</div>
          </div>
        </div>
      </div>

      {/* Free trial: friendly nudge so a free student knows their first class
          is free and exactly how to book it (no confusing paywall). */}
      {canBookTrial && (
        <Card className="p-4 border-2 border-primary/40 bg-primary/5">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-bold">🎁 Tu primera clase es GRATIS</p>
              <p className="text-muted-foreground">Elige una clase abajo y toca “Reservar mi lugar”. Es tu clase de prueba, sin costo.</p>
            </div>
          </div>
        </Card>
      )}
      {trialUsed && myBookings.length > 0 && (
        <Card className="p-4 border bg-muted/30">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">Ya usaste tu clase de prueba gratis. Pasa a un plan para reservar más.</p>
            <Button size="sm" asChild><Link href="/choose-plan">Ver planes</Link></Button>
          </div>
        </Card>
      )}

      {/* Warm-up entry — quick game before the live class */}
      <DailyChallengeWidget variant="compact" />

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
                <span className="inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> All</span>
              </Chip>
              {interests.map((i) => (
                <Chip key={i.id} selected={interestFilter === i.id} onClick={() => setInterestFilter(i.id)}>
                  <span className="inline-flex items-center gap-1.5">
                    <InterestIcon name={i.name} size="sm" className="!w-5 !h-5 !rounded-md !shadow-none" />
                    {i.name}
                  </span>
                </Chip>
              ))}
            </div>
          </div>

          {/* Split into LIVE NOW + STARTING SOON + UPCOMING for prominent display */}
          {filtered.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No upcoming labs right now{interestFilter !== "all" && " for this interest"}. Check back soon!
            </Card>
          ) : (
            <>
              {/* LIVE NOW section */}
              {filtered.filter((s) => s.liveStatus === "live").length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                    <span className="text-xs font-mono uppercase tracking-widest text-red-600 font-bold">LIVE NOW</span>
                  </div>
                  {filtered.filter((s) => s.liveStatus === "live").map((s) => (
                    <SessionCard key={s.id} session={s} interest={interestById.get(s.interestTopicId)}
                      isBooked={myBookedIds.has(s.id)}
                      onBook={() => bookMutation.mutate(s.id)}
                      bookPending={bookMutation.isPending}
                      outOfLevel={!canBookLevel(s.level)}
                      live
                    />
                  ))}
                </div>
              )}

              {/* STARTING SOON section */}
              {filtered.filter((s) => s.liveStatus === "starting_soon").length > 0 && (
                <div className="space-y-2 pt-3">
                  <span className="text-xs font-mono uppercase tracking-widest text-amber-600 font-bold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> STARTING SOON</span>
                  {filtered.filter((s) => s.liveStatus === "starting_soon").map((s) => (
                    <SessionCard key={s.id} session={s} interest={interestById.get(s.interestTopicId)}
                      isBooked={myBookedIds.has(s.id)}
                      onBook={() => bookMutation.mutate(s.id)}
                      bookPending={bookMutation.isPending}
                      outOfLevel={!canBookLevel(s.level)}
                      startingSoon
                    />
                  ))}
                </div>
              )}

              {/* UPCOMING section */}
              {filtered.filter((s) => s.liveStatus === "upcoming" || !s.liveStatus).length > 0 && (
                <div className="space-y-2 pt-3">
                  <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> UPCOMING</span>
                  {filtered.filter((s) => s.liveStatus === "upcoming" || !s.liveStatus).map((s) => (
                    <SessionCard key={s.id} session={s} interest={interestById.get(s.interestTopicId)}
                      isBooked={myBookedIds.has(s.id)}
                      onBook={() => bookMutation.mutate(s.id)}
                      bookPending={bookMutation.isPending}
                      outOfLevel={!canBookLevel(s.level)}
                    />
                  ))}
                </div>
              )}
            </>
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
                    <InterestIcon name={interest?.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm mb-1">{s.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(s.scheduledAt)}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(s.scheduledAt)} · {s.durationMinutes} min</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" asChild>
                          <Link href={`/dashboard/labs/${s.id}/room`} className="flex items-center justify-center gap-2"><Radio className="w-4 h-4" /> Join class</Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => s.registrationId && cancelMutation.mutate(s.registrationId)}
                          disabled={cancelMutation.isPending}
                        >
                          <X className="w-3 h-3 mr-1" /> Cancel
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

interface SessionCardProps {
  session: LabSession;
  interest: InterestTopic | undefined;
  isBooked: boolean;
  onBook: () => void;
  bookPending: boolean;
  live?: boolean;
  startingSoon?: boolean;
  outOfLevel?: boolean;
}

function SessionCard({ session: s, interest, isBooked, onBook, bookPending, live, startingSoon, outOfLevel }: SessionCardProps) {
  const spotsLeft = s.maxParticipants - (s.bookedCount ?? 0);
  const isFull = spotsLeft <= 0;
  const borderColor = live ? "border-red-500" : startingSoon ? "border-amber-500" : "";
  const bgTint = live ? "bg-red-50 dark:bg-red-950/20" : startingSoon ? "bg-amber-50 dark:bg-amber-950/20" : "";

  return (
    <Card className={`p-4 hover-elevate ${borderColor} ${bgTint} ${live ? "border-2" : ""}`}>
      <div className="flex items-start gap-3">
        <InterestIcon name={interest?.name} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {live && (
              <Badge className="bg-red-600 text-white text-[10px] animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
              </Badge>
            )}
            {startingSoon && (
              <Badge className="bg-amber-500 text-white text-[10px] flex items-center gap-1">
                <Clock className="w-3 h-3" /> STARTING NOW
              </Badge>
            )}
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
          <div className="mt-3 flex flex-wrap gap-2">
            {live && isBooked && (
              <Button size="sm" className="bg-red-600 hover:bg-red-700" asChild>
                <Link href={`/dashboard/labs/${s.id}/room`} className="flex items-center justify-center gap-2"><Radio className="w-4 h-4" /> Join now</Link>
              </Button>
            )}
            {live && !isBooked && !isFull && !outOfLevel && (
              <Button size="sm" className="bg-red-600 hover:bg-red-700" asChild>
                <Link href={`/dashboard/labs/${s.id}/room`} className="flex items-center justify-center gap-2"><Radio className="w-4 h-4" /> Join class</Link>
              </Button>
            )}
            {live && !isBooked && outOfLevel && (
              <Badge variant="outline" className="text-muted-foreground" title="You can join classes at your level, one above, or one below.">Not your level</Badge>
            )}
            {!live && (
              <>
                {isBooked ? (
                  <Badge variant="default" className="bg-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Booked</Badge>
                ) : outOfLevel ? (
                  <Badge variant="outline" className="text-muted-foreground" title="You can book classes at your level, one above, or one below.">Not your level</Badge>
                ) : isFull ? (
                  <Badge variant="secondary">Full</Badge>
                ) : (
                  <Button size="sm" onClick={onBook} disabled={bookPending} data-testid={`button-book-${s.id}`}>
                    {bookPending ? (
                      "Booking…"
                    ) : (
                      <span className="flex items-center justify-center gap-2"><Bookmark className="w-4 h-4" /> Book my spot ({spotsLeft} left)</span>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
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
