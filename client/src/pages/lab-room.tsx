/**
 * Lab Room page — the in-app live class experience.
 *
 * Route: /dashboard/labs/:sessionId/room
 *
 * Renders the LiveVideoPanel iframe (Jitsi) with the session metadata
 * sidebar so the student sees:
 *   - Title + interest + level badges + grammar focus
 *   - Target vocabulary chips
 *   - Target expressions
 *
 * Auth-gates by fetching /api/lab-bookings/mine and checking that the
 * student is registered for this session. If not registered (or not
 * yet — early arrival before booking), shows a friendly message with
 * a "Book this Lab" CTA.
 *
 * Per spec page 1: split-screen UX — video on the left, activity
 * content on the right. On mobile, stacks vertically (video on top).
 */

import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, MessageSquare, BookOpen, Quote, Info, Calendar, Clock, PhoneOff } from "lucide-react";
import LiveVideoPanel from "@/components/lab/live-video-panel";
import { ClaseCierre } from "@/components/lab/clase-cierre";
import { InterestIcon } from "@/components/lab/interest-icon";

interface LabSession {
  id: string;
  interestTopicId: string;
  level: string;
  title: string;
  description: string | null;
  grammarFocus: string | null;
  vocabulary: string[];
  expressions: string[];
  scheduledAt: string;
  durationMinutes: number;
  meetingUrl: string | null;
  maxParticipants: number;
  status: string;
  liveStatus?: "live" | "starting_soon" | "upcoming";
}

interface InterestTopic {
  id: string;
  name: string;
  icon: string | null;
}

export default function LabRoomPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  // Resolve full name for the Jitsi participant list
  const userName = ([(user as any)?.firstName, (user as any)?.lastName].filter(Boolean).join(" ") || (user as any)?.email || "Student").trim();

  // Fetch user's bookings to verify registration + get the session details
  const studentLevel = (user as any)?.currentLevel || (user as any)?.placementLevel || "A1";
  const { data: myBookings = [], isLoading: bookingsLoading } = useQuery<LabSession[]>({
    queryKey: ["/api/lab-bookings/mine"],
  });
  const { data: upcoming = [] } = useQuery<LabSession[]>({
    queryKey: [`/api/lab-sessions/upcoming?level=${studentLevel}`],
  });
  const { data: interests = [] } = useQuery<InterestTopic[]>({
    queryKey: ["/api/lab-interest-topics"],
  });

  // Look up the session: first in my bookings, then in upcoming. If neither
  // matches (e.g. session is LIVE NOW and student never pre-booked, or admin
  // is entering as teacher), fall back to fetching the single session by ID.
  const sessionFromBooking = myBookings.find((s) => s.id === sessionId);
  const sessionFromUpcoming = upcoming.find((s) => s.id === sessionId);
  const haveSessionFromList = !!(sessionFromBooking ?? sessionFromUpcoming);
  const { data: sessionDirect } = useQuery<LabSession>({
    queryKey: [`/api/lab-sessions/${sessionId}`],
    enabled: !!sessionId && !haveSessionFromList && !bookingsLoading,
  });
  const session = sessionFromBooking ?? sessionFromUpcoming ?? sessionDirect;
  const isRegistered = !!sessionFromBooking;
  const isAdmin = !!(user as any)?.isAdmin;
  const isStaff = isAdmin || (user as any)?.role === "instructor" || (user as any)?.role === "teacher";

  // End-of-class Cierre (students only, Coral's option A). Poll the session
  // status while in the room; when the teacher ends the class (status →
  // completed), pop the quiz + survey for whoever is still here.
  const [showCierre, setShowCierre] = useState(false);
  const [cierreDismissed, setCierreDismissed] = useState(false);
  const { data: livePoll } = useQuery<{ status?: string }>({
    queryKey: [`/api/lab-sessions/${sessionId}`, "cierre-poll"],
    queryFn: () => fetch(`/api/lab-sessions/${sessionId}`, { credentials: "include" }).then((r) => r.json()),
    enabled: !!sessionId && !isStaff,
    refetchInterval: !isStaff && !showCierre && !cierreDismissed ? 20000 : false,
  });
  useEffect(() => {
    if (!isStaff && livePoll?.status === "completed" && !cierreDismissed) setShowCierre(true);
  }, [livePoll?.status, isStaff, cierreDismissed]);

  // Teacher ends the class — the authoritative "class over" trigger.
  const endClassMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/lab-sessions/${sessionId}/end`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("No se pudo terminar la clase");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Clase terminada", description: "Los estudiantes verán su cierre. Ya puedes cerrar la videollamada." });
      navigate("/dashboard/labs");
    },
    onError: (e: any) => toast({ title: "No se pudo terminar", description: e?.message, variant: "destructive" }),
  });

  const interestById = new Map(interests.map((i) => [i.id, i]));
  const interest = session ? interestById.get(session.interestTopicId) : undefined;

  const bookAndJoinMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/lab-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labSessionId: sessionId }),
        credentials: "include",
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || e.error || "Booking failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "You're in the Lab!" });
      qc.invalidateQueries({ queryKey: ["/api/lab-bookings/mine"] });
    },
    onError: (err: any) => {
      toast({ title: "Couldn't join", description: err?.message, variant: "destructive" });
    },
  });

  if (bookingsLoading) {
    return <div className="container mx-auto p-6 text-center">Loading…</div>;
  }
  if (!session) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-8 text-center space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto text-amber-500" />
          <h2 className="text-xl font-bold">This Lab doesn't exist or isn't for your level</h2>
          <p className="text-muted-foreground text-sm">
            Check the link or go back to the Labs available for your level ({studentLevel}).
          </p>
          <Button onClick={() => navigate("/dashboard/labs")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Labs
          </Button>
        </Card>
      </div>
    );
  }

  // Compute live status client-side as a fallback
  const now = Date.now();
  const start = new Date(session.scheduledAt).getTime();
  const end = start + session.durationMinutes * 60_000;
  const isLive = start <= now && end > now;
  const isStartingSoon = !isLive && start - now <= 15 * 60_000;
  const isOver = end <= now;

  return (
    <div className="container mx-auto p-4 space-y-4" data-testid="page-lab-room">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/labs")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Labs
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <InterestIcon name={interest?.name} size="sm" />
            <h1 className="text-lg font-bold">{session.title}</h1>
            <Badge variant="outline" className="text-[10px]">{session.level}</Badge>
            {interest && <Badge variant="secondary" className="text-[10px]">{interest.name}</Badge>}
            {isLive && (
              <Badge className="bg-red-600 text-[10px] animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
              </Badge>
            )}
            {isStartingSoon && (
              <Badge className="bg-amber-500 text-[10px] flex items-center gap-1">
                <Clock className="w-3 h-3" /> Starting soon
              </Badge>
            )}
            {isOver && <Badge variant="secondary" className="text-[10px]">Ended</Badge>}
          </div>
        </div>
      </div>

      {isOver && !isAdmin ? (
        <Card className="p-8 text-center space-y-2">
          <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground" />
          <h2 className="text-lg font-bold">This session has ended</h2>
          <p className="text-sm text-muted-foreground">Find the next available Lab.</p>
          <Button onClick={() => navigate("/dashboard/labs")}>View available Labs</Button>
        </Card>
      ) : !isRegistered && !isAdmin && !isLive ? (
        // Only block on registration when class hasn't started yet. If LIVE,
        // let anyone join (no friction for a class in progress). Admins
        // always bypass the registration check (teacher access).
        <Card className="p-6 text-center space-y-3">
          <h2 className="text-lg font-bold">You're not registered for this Lab yet</h2>
          <p className="text-sm text-muted-foreground">
            To join the video call, book your spot first. Once registered, you'll get in automatically.
          </p>
          <Button onClick={() => bookAndJoinMutation.mutate()} disabled={bookAndJoinMutation.isPending}>
            {bookAndJoinMutation.isPending ? (
              "Joining…"
            ) : (
              <><Calendar className="w-4 h-4 mr-2" /> Book and join</>
            )}
          </Button>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Video panel — left/main on desktop, top on mobile */}
          <div className="lg:col-span-2">
            <LiveVideoPanel
              meetingUrlOrRoom={session.meetingUrl || `cogniboost-${session.id}`}
              userName={userName}
              onMeetingEnd={async () => {
                // If the teacher already ended the class, show the Cierre
                // (quiz + survey) instead of bouncing the student out.
                if (!isStaff && !cierreDismissed) {
                  try {
                    const s = await fetch(`/api/lab-sessions/${sessionId}`, { credentials: "include" }).then((r) => r.json());
                    if (s?.status === "completed") { setShowCierre(true); return; }
                  } catch { /* fall through to normal exit */ }
                }
                toast({
                  title: "Class ended",
                  description: "You can rejoin or pick a new lab from your dashboard.",
                });
                navigate("/dashboard/labs");
              }}
            />
          </div>

          {/* Activity sidebar — right on desktop, below on mobile */}
          <div className="space-y-3">
            {isStaff && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => endClassMutation.mutate()}
                disabled={endClassMutation.isPending}
                data-testid="button-end-class"
              >
                <PhoneOff className="w-4 h-4 mr-2" /> {endClassMutation.isPending ? "Terminando…" : "Terminar clase"}
              </Button>
            )}
            <Card className="p-4 space-y-2">
              <h3 className="text-sm font-bold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" /> Topic</h3>
              {session.description && <p className="text-sm">{session.description}</p>}
              {session.grammarFocus && (
                <p className="text-xs"><strong>Grammar focus:</strong> <span className="text-muted-foreground">{session.grammarFocus}</span></p>
              )}
            </Card>

            {session.vocabulary && session.vocabulary.length > 0 && (
              <Card className="p-4 space-y-2">
                <h3 className="text-sm font-bold flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Vocabulary to use</h3>
                <div className="flex flex-wrap gap-1">
                  {session.vocabulary.map((v) => (
                    <span key={v} className="text-xs bg-secondary px-2 py-1 rounded">{v}</span>
                  ))}
                </div>
              </Card>
            )}

            {session.expressions && session.expressions.length > 0 && (
              <Card className="p-4 space-y-2">
                <h3 className="text-sm font-bold flex items-center gap-2"><Quote className="w-4 h-4 text-primary" /> Useful expressions</h3>
                <ul className="space-y-1">
                  {session.expressions.map((e) => (
                    <li key={e} className="text-xs">• {e}</li>
                  ))}
                </ul>
              </Card>
            )}

            <Card className="p-4 text-xs text-muted-foreground flex gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>If the video doesn't load, allow camera + microphone in your browser. On mobile, use Chrome or Safari.</span>
            </Card>
          </div>
        </div>
      )}

      {showCierre && session && (
        <ClaseCierre
          sessionId={sessionId!}
          topic={interest?.name || session.title}
          onDone={(msg) => {
            setShowCierre(false);
            setCierreDismissed(true);
            if (msg) toast({ title: msg });
            navigate("/dashboard/labs");
          }}
        />
      )}
    </div>
  );
}
