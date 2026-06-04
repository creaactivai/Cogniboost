/**
 * Admin Labs page — Phase 1.6 interest-driven Conversation Labs management.
 *
 * What you can do here:
 *   - See ALL lab sessions across levels (upcoming, past, cancelled)
 *   - Create new sessions with full pedagogical context
 *   - Edit existing sessions
 *   - Cancel a session (status='cancelled', students see it disappear)
 *   - View who registered + attendance
 *
 * NOTE: legacy LiveSession-based management was previously here. Legacy
 * live_sessions rows (the 9 generic "Class Lab" Google Meet links) are
 * still in the DB and accessible at /dashboard/labs-legacy for history.
 */

import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, X as XIcon, Calendar, Clock, Users, Save, Sparkles, Radio } from "lucide-react";
import { InterestIcon } from "@/components/lab/interest-icon";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

interface InterestTopic { id: string; name: string; icon: string | null; }
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
  bookedCount?: number;
}

export default function AdminLabsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: interests = [] } = useQuery<InterestTopic[]>({
    queryKey: ["/api/lab-interest-topics"],
  });
  const { data: sessions = [], isLoading } = useQuery<LabSession[]>({
    queryKey: ["/api/admin/lab-sessions"],
  });

  const interestById = useMemo(
    () => new Map(interests.map((i) => [i.id, i])),
    [interests]
  );

  const now = new Date();
  const upcoming = sessions.filter((s) => s.status !== "cancelled" && new Date(s.scheduledAt) >= now);
  const past = sessions.filter((s) => s.status !== "cancelled" && new Date(s.scheduledAt) < now);
  const cancelled = sessions.filter((s) => s.status === "cancelled");

  const [editingSession, setEditingSession] = useState<LabSession | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [viewingRegistrationsFor, setViewingRegistrationsFor] = useState<LabSession | null>(null);
  const [cancelTarget, setCancelTarget] = useState<LabSession | null>(null);

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/lab-sessions/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Cancel failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Lab cancelado" });
      qc.invalidateQueries({ queryKey: ["/api/admin/lab-sessions"] });
      setCancelTarget(null);
    },
  });

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "Impact, Arial Black, sans-serif" }}>
              CONVERSATION LABS
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Programa sesiones en vivo por interest × level. Phase 1.6 — interest-driven design.
            </p>
          </div>
          <Button onClick={() => setCreatingNew(true)} data-testid="button-create-lab">
            <Plus className="w-4 h-4 mr-2" /> Nueva Sesión
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando…</div>
        ) : (
          <Tabs defaultValue="upcoming">
            <TabsList>
              <TabsTrigger value="upcoming">Próximas <Badge variant="default" className="ml-2">{upcoming.length}</Badge></TabsTrigger>
              <TabsTrigger value="past">Pasadas <Badge variant="secondary" className="ml-2">{past.length}</Badge></TabsTrigger>
              <TabsTrigger value="cancelled">Canceladas <Badge variant="outline" className="ml-2">{cancelled.length}</Badge></TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-2 pt-3">
              {upcoming.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  No hay sesiones programadas. Click "Nueva Sesión" para crear la primera.
                </Card>
              ) : (
                upcoming.map((s) => (
                  <SessionRow key={s.id} session={s} interest={interestById.get(s.interestTopicId)}
                    onEdit={() => setEditingSession(s)}
                    onViewRegs={() => setViewingRegistrationsFor(s)}
                    onCancel={() => setCancelTarget(s)}
                  />
                ))
              )}
            </TabsContent>
            <TabsContent value="past" className="space-y-2 pt-3">
              {past.map((s) => (
                <SessionRow key={s.id} session={s} interest={interestById.get(s.interestTopicId)}
                  onEdit={() => setEditingSession(s)}
                  onViewRegs={() => setViewingRegistrationsFor(s)}
                  pastSession
                />
              ))}
            </TabsContent>
            <TabsContent value="cancelled" className="space-y-2 pt-3">
              {cancelled.map((s) => (
                <SessionRow key={s.id} session={s} interest={interestById.get(s.interestTopicId)} cancelled />
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Create / Edit dialog */}
      {(creatingNew || editingSession) && (
        <LabSessionEditor
          interests={interests}
          session={editingSession ?? undefined}
          onClose={() => { setCreatingNew(false); setEditingSession(null); }}
        />
      )}

      {/* Registrations modal */}
      {viewingRegistrationsFor && (
        <RegistrationsModal
          session={viewingRegistrationsFor}
          onClose={() => setViewingRegistrationsFor(null)}
        />
      )}

      {/* Cancel confirmation */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar este Lab?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{cancelTarget?.title}</strong> — {cancelTarget?.bookedCount ?? 0} estudiantes reservados.
              Esta acción es reversible (puedes des-cancelar editando el status después).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener</AlertDialogCancel>
            <AlertDialogAction onClick={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}>
              Sí, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

interface SessionRowProps {
  session: LabSession;
  interest: InterestTopic | undefined;
  onEdit?: () => void;
  onViewRegs?: () => void;
  onCancel?: () => void;
  pastSession?: boolean;
  cancelled?: boolean;
}

function SessionRow({ session: s, interest, onEdit, onViewRegs, onCancel, pastSession, cancelled }: SessionRowProps) {
  const [, navigate] = useLocation();
  // Host the class INSIDE CogniBoost (branded video, clean end screen) instead
  // of opening the raw native Jitsi room (which shows "Jitsi" branding + a
  // promotional close page). Same room, but wrapped in our app.
  const joinInApp = () => navigate(`/dashboard/labs/${s.id}/room`);
  return (
    <Card className={`p-3 ${cancelled ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-3 flex-wrap">
        <InterestIcon name={interest?.name} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm">{s.title}</h3>
            <Badge variant="outline" className="text-[10px]">{s.level}</Badge>
            {interest && <Badge variant="secondary" className="text-[10px]">{interest.name}</Badge>}
            {cancelled && <Badge variant="destructive" className="text-[10px]">CANCELADA</Badge>}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDateTime(s.scheduledAt)}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.durationMinutes} min</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{s.bookedCount ?? 0}/{s.maxParticipants}</span>
            {s.grammarFocus && <span>· Focus: <strong>{s.grammarFocus}</strong></span>}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0 items-center">
          {/* JOIN button — only shown when meetingUrl exists and session
              is within its live window (5 min before to end of session). */}
          {s.meetingUrl && !cancelled && !pastSession && (() => {
            const start = new Date(s.scheduledAt).getTime();
            const end = start + s.durationMinutes * 60_000;
            const now = Date.now();
            const isLive = start - 5 * 60_000 <= now && end + 10 * 60_000 >= now;
            const isSoon = !isLive && start - now <= 60 * 60_000 && start > now;
            if (isLive) {
              return (
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white animate-pulse"
                  onClick={joinInApp}
                >
                  <Radio className="w-3.5 h-3.5 mr-1" />
                  JOIN NOW
                </Button>
              );
            }
            if (isSoon) {
              return (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={joinInApp}
                  title="Class starts within an hour — you can enter early"
                >
                  <Radio className="w-3.5 h-3.5 mr-1" />
                  Enter early
                </Button>
              );
            }
            return (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(s.meetingUrl!, '_blank', 'noopener,noreferrer')}
                title="Iniciar clase (dentro de CogniBoost)"
              >
                <Radio className="w-3.5 h-3.5" />
              </Button>
            );
          })()}
          {onViewRegs && (
            <Button variant="ghost" size="sm" onClick={onViewRegs} title="Ver registrados">
              <Users className="w-4 h-4" />
            </Button>
          )}
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} title="Editar">
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          {onCancel && !pastSession && (
            <Button variant="ghost" size="sm" onClick={onCancel} title="Cancelar">
              <XIcon className="w-4 h-4 text-red-500" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

interface LabSessionEditorProps {
  interests: InterestTopic[];
  session?: LabSession;
  onClose: () => void;
}

function LabSessionEditor({ interests, session, onClose }: LabSessionEditorProps) {
  const isEdit = !!session;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [interestTopicId, setInterestTopicId] = useState(session?.interestTopicId ?? interests[0]?.id ?? "");
  const [level, setLevel] = useState(session?.level ?? "A1");
  const [title, setTitle] = useState(session?.title ?? "");
  const [description, setDescription] = useState(session?.description ?? "");
  const [grammarFocus, setGrammarFocus] = useState(session?.grammarFocus ?? "");
  const [vocabulary, setVocabulary] = useState((session?.vocabulary ?? []).join(", "));
  const [expressions, setExpressions] = useState((session?.expressions ?? []).join(" | "));
  const [moduleReference, setModuleReference] = useState(session?.moduleReference ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    session?.scheduledAt
      ? formatForInput(session.scheduledAt)
      : formatForInput(new Date(Date.now() + 86400000).toISOString())
  );
  const [durationMinutes, setDurationMinutes] = useState(session?.durationMinutes ?? 60);
  const [meetingUrl, setMeetingUrl] = useState(session?.meetingUrl ?? "");
  const [maxParticipants, setMaxParticipants] = useState(session?.maxParticipants ?? 8);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        interestTopicId, level, title,
        description: description.trim() || null,
        grammarFocus: grammarFocus.trim() || null,
        vocabulary: vocabulary.split(",").map((v) => v.trim()).filter(Boolean),
        expressions: expressions.split("|").map((v) => v.trim()).filter(Boolean),
        moduleReference: moduleReference.trim() || null,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: Number(durationMinutes),
        meetingUrl: meetingUrl.trim() || null,
        maxParticipants: Number(maxParticipants),
      };
      const url = isEdit ? `/api/admin/lab-sessions/${session!.id}` : "/api/admin/lab-sessions";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Save failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: isEdit ? "Lab actualizado" : "Lab creado" });
      qc.invalidateQueries({ queryKey: ["/api/admin/lab-sessions"] });
      qc.invalidateQueries({ queryKey: [/^\/api\/lab-sessions\/upcoming/] as any });
      onClose();
    },
    onError: (err: any) => toast({ title: "Error", description: err?.message, variant: "destructive" }),
  });

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Lab Session" : "Crear Lab Session"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Interest</Label>
              <Select value={interestTopicId} onValueChange={setInterestTopicId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {interests.map((i) => <SelectItem key={i.id} value={i.id}>{i.icon} {i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nivel CEFR</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A1 — Movies: Who IS the hero?" />
          </div>

          <div>
            <Label>Descripción (opcional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div>
            <Label>Grammar Focus</Label>
            <Input value={grammarFocus} onChange={(e) => setGrammarFocus(e.target.value)} placeholder="verb TO BE / Present Simple / etc." />
          </div>

          <div>
            <Label>Vocabulario (separado por comas)</Label>
            <Textarea value={vocabulary} onChange={(e) => setVocabulary(e.target.value)} rows={2}
              placeholder="movie, actor, hero, funny, scary" />
          </div>

          <div>
            <Label>Expresiones (separadas por |)</Label>
            <Textarea value={expressions} onChange={(e) => setExpressions(e.target.value)} rows={2}
              placeholder="The hero is... | My favorite movie is... | I think it is..." />
          </div>

          <div>
            <Label>Module reference (opcional)</Label>
            <Input value={moduleReference} onChange={(e) => setModuleReference(e.target.value)}
              placeholder='Ej: "A1 Module 1"' />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Fecha y hora</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <div>
              <Label>Duración (min)</Label>
              <Input type="number" min={15} max={180} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Meeting URL</Label>
              <Input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://meet.jit.si/cogniboost-..." />
            </div>
            <div>
              <Label>Max estudiantes</Label>
              <Input type="number" min={1} max={50} value={maxParticipants} onChange={(e) => setMaxParticipants(Number(e.target.value))} />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t">
            <Button variant="ghost" onClick={onClose} disabled={saveMutation.isPending}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !title.trim()}>
              {saveMutation.isPending ? (
                "Guardando…"
              ) : isEdit ? (
                <span className="inline-flex items-center gap-2"><Save className="w-4 h-4" /> Actualizar</span>
              ) : (
                <span className="inline-flex items-center gap-2"><Sparkles className="w-4 h-4" /> Crear Lab</span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface Registration {
  registrationId: string;
  registeredAt: string;
  attended: boolean | null;
  speakingTimeMinutes: number | null;
  teacherFeedback: string | null;
  teacherRating: number | null;
  student: { id: string; firstName: string | null; lastName: string | null; email: string; subscriptionTier?: string };
}

function RegistrationsModal({ session, onClose }: { session: LabSession; onClose: () => void }) {
  const { data: regs = [], isLoading } = useQuery<Registration[]>({
    queryKey: [`/api/admin/lab-sessions/${session.id}/registrations`],
    enabled: !!session.id,
  });

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Estudiantes registrados — {session.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-4">Cargando…</p>
          ) : regs.length === 0 ? (
            <Card className="p-4 text-center text-muted-foreground">
              Nadie reservado todavía.
            </Card>
          ) : (
            regs.map((r) => (
              <Card key={r.registrationId} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">
                    {r.student.firstName} {r.student.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground">{r.student.email}</div>
                </div>
                <Badge variant="outline" className="text-[10px]">{r.student.subscriptionTier ?? "free"}</Badge>
                {r.attended === true && <Badge className="bg-green-600 text-[10px]">Asistió</Badge>}
                {r.attended === false && <Badge variant="destructive" className="text-[10px]">No asistió</Badge>}
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatForInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}
