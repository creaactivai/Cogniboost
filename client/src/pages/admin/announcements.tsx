/**
 * Admin · Announcements (full system)
 *
 * Tabs:
 *  1. Nuevo Anuncio — template picker, editor, audience selector (today /
 *     this_week / all_active / by_level [multi-select] / by_lab [specific])
 *     with visual + recipient preview, then send.
 *  2. Historial — list of past announcements with stats and "Duplicar" button.
 *
 * Every send is logged to the `announcements` table.
 */

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Mail,
  Eye,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Monitor,
  History,
  Copy,
  Plus,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────
interface Recipient {
  userId: string;
  email: string;
  firstName: string | null;
  source: string;
}
interface PreviewResponse {
  dryRun: true;
  recipients: Recipient[];
  recipientCount: number;
  audience: string;
}
interface SendResponse {
  dryRun: false;
  recipientCount: number;
  sent: number;
  failed: number;
  failures: Array<{ email: string; error: string }>;
}
interface AnnouncementRow {
  id: string;
  subject: string;
  htmlBody: string;
  audienceType: string;
  audienceConfig: any;
  template: string | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  failureDetails: any;
  sentAt: string;
}
interface LabOption {
  id: string;
  title: string;
  level: string;
  scheduledAt: string;
  registrationCount: number;
}

// ── Email templates (HTML, table-based, inline CSS, Gmail/Outlook safe) ──
const EMAIL_BASE = (innerBody: string) => `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F5F8FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1B1B41;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F5F8FB;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(27,27,65,0.06);">
<tr><td style="background:#FFFFFF;padding:24px 32px 16px 32px;border-bottom:1px solid #EEF1F7;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
<td style="font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#1B1B41;text-transform:uppercase;">Cogni<span style="color:#667EEB;">boost</span></td>
<td align="right" style="font-size:11px;letter-spacing:2px;color:#8B8FA8;text-transform:uppercase;font-weight:600;">ESL Academy</td>
</tr></table>
</td></tr>
${innerBody}
<tr><td style="background:#F5F8FB;padding:24px 32px;border-top:1px solid #EEF1F7;text-align:center;">
<p style="margin:0 0 6px 0;font-size:13px;color:#1B1B41;font-weight:600;">CogniBoost ESL Academy</p>
<p style="margin:0;font-size:11px;color:#8B8FA8;line-height:1.6;">
Conviértete en un hablante de inglés seguro y fluido.<br />
<a href="https://cogniboost.co" style="color:#667EEB;text-decoration:none;font-weight:600;">cogniboost.co</a> &nbsp;·&nbsp;
<a href="mailto:clozano@cognimight.com" style="color:#667EEB;text-decoration:none;">Contactar</a>
</p></td></tr>
</table>
<p style="margin:16px 0 0 0;font-size:11px;color:#8B8FA8;text-align:center;">Recibiste este correo porque eres estudiante activo de CogniBoost.</p>
</td></tr></table></body></html>`;

const HERO = (emoji: string, title: string, subtitle: string) => `
<tr><td style="background:linear-gradient(135deg,#1B1B41 0%,#2A2D5C 100%);padding:36px 32px;text-align:center;">
<p style="margin:0 0 8px 0;font-size:36px;line-height:1;">${emoji}</p>
<h1 style="margin:0 0 6px 0;font-size:26px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">${title}</h1>
<p style="margin:0;font-size:14px;color:#F5AE56;font-weight:600;text-transform:uppercase;letter-spacing:2px;">${subtitle}</p>
</td></tr>`;

const BODY_OPEN = `<tr><td style="padding:36px 32px 24px 32px;">`;
const BODY_CLOSE = `</td></tr>`;
const GREETING = `<p style="margin:0 0 18px 0;font-size:16px;line-height:1.6;color:#1B1B41;">Hola <strong>{{firstName}}</strong>,</p>`;
const SIGN_OFF = (role: string) => `
<p style="margin:24px 0 0 0;font-size:15px;line-height:1.6;color:#1B1B41;">
Un abrazo,<br />
<strong style="color:#667EEB;">Coral Lozano</strong><br />
<span style="font-size:13px;color:#8B8FA8;">${role}</span></p>`;
const CTA = (text: string, url: string) => `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px 0;">
<tr><td align="center">
<a href="${url}" style="display:inline-block;background:#667EEB;color:#FFFFFF;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:0.3px;">${text}</a>
</td></tr></table>`;
const TIP_CALLOUT = (title: string, body: string) => `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
<tr><td style="background:#FFF8EE;border-left:4px solid #F5AE56;border-radius:6px;padding:18px 20px;">
<p style="margin:0 0 8px 0;font-size:11px;color:#C97D1E;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">💡 ${title}</p>
<div style="font-size:14px;line-height:1.6;color:#1B1B41;">${body}</div>
</td></tr></table>`;

const TEMPLATES = [
  {
    key: "memorial_day",
    label: "Memorial Day (hoy)",
    subject: "Hoy no hay clase — Memorial Day 🇺🇸",
    body: EMAIL_BASE(
      HERO("🇺🇸", "Memorial Day", "Hoy no hay clase en vivo") +
      BODY_OPEN + GREETING +
      `<p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#3A3D5C;">Hoy es <strong>Memorial Day</strong> en Estados Unidos — un día festivo nacional donde se honra a los soldados que murieron sirviendo al país. Por eso <strong>hoy no tendremos clase en vivo</strong>.</p>` +
      TIP_CALLOUT(
        "English tip del día",
        `<p style="margin:0 0 8px 0;">"Memorial Day" <strong>no</strong> se traduce como "Día de los Muertos" — son cosas totalmente diferentes.</p><p style="margin:0;font-style:italic;">Si quieres impresionar a alguien hoy, di: <strong>"Memorial Day honors fallen soldiers."</strong></p>`
      ) +
      `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#3A3D5C;">Mientras tanto la plataforma está abierta. Practica con tus lecciones, escritura, speaking o vocabulario.</p>` +
      CTA("Ir a mi dashboard →", "https://cogniboost.co/dashboard") +
      `<p style="margin:24px 0 0 0;font-size:15px;line-height:1.6;color:#3A3D5C;">Mañana volvemos a las clases en vivo. <strong>¡Disfruta tu lunes!</strong></p>` +
      SIGN_OFF("Directora Académica · CogniBoost") +
      BODY_CLOSE
    ),
  },
  {
    key: "class_cancelled",
    label: "Cancelación de clase",
    subject: "Clase cancelada hoy — nos vemos pronto",
    body: EMAIL_BASE(
      HERO("📣", "Clase cancelada", "Te avisaremos cuando se reagende") +
      BODY_OPEN + GREETING +
      `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#3A3D5C;">Por motivos imprevistos <strong>la clase en vivo de hoy queda cancelada</strong>. Te avisaremos por correo cuando se reagende.</p>` +
      `<p style="margin:0 0 24px 0;font-size:15px;line-height:1.7;color:#3A3D5C;">Mientras tanto, recuerda que la plataforma está disponible 24/7 para que sigas practicando.</p>` +
      CTA("Practicar en la plataforma →", "https://cogniboost.co/dashboard") +
      SIGN_OFF("CogniBoost ESL Academy") +
      BODY_CLOSE
    ),
  },
  {
    key: "schedule_change",
    label: "Cambio de horario",
    subject: "Cambio en el horario de tu clase",
    body: EMAIL_BASE(
      HERO("📅", "Cambio de horario", "Por favor revisa la nueva fecha") +
      BODY_OPEN + GREETING +
      `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#3A3D5C;">Te escribimos para avisarte que <strong>el horario de tu próxima clase ha cambiado</strong>. Por favor revisa tu dashboard para ver los nuevos detalles.</p>` +
      CTA("Ver mi calendario →", "https://cogniboost.co/dashboard/labs") +
      SIGN_OFF("CogniBoost ESL Academy") +
      BODY_CLOSE
    ),
  },
  {
    key: "new_content",
    label: "Contenido nuevo disponible",
    subject: "Nuevo contenido en CogniBoost ✨",
    body: EMAIL_BASE(
      HERO("✨", "Contenido nuevo", "Disponible para ti ahora") +
      BODY_OPEN + GREETING +
      `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#3A3D5C;">¡Tenemos contenido nuevo en la plataforma! <strong>Acabamos de subir lecciones nuevas</strong> para que sigas avanzando.</p>` +
      `<p style="margin:0 0 24px 0;font-size:15px;line-height:1.7;color:#3A3D5C;">Entra a tu dashboard para verlo:</p>` +
      CTA("Ver lo nuevo →", "https://cogniboost.co/dashboard") +
      SIGN_OFF("CogniBoost ESL Academy") +
      BODY_CLOSE
    ),
  },
  {
    key: "blank",
    label: "En blanco",
    subject: "",
    body: EMAIL_BASE(
      BODY_OPEN + GREETING +
      `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#3A3D5C;">Escribe aquí el contenido del correo...</p>` +
      SIGN_OFF("CogniBoost ESL Academy") +
      BODY_CLOSE
    ),
  },
];

const AUDIENCE_OPTIONS = [
  { value: "today", label: "Estudiantes con clase HOY" },
  { value: "this_week", label: "Estudiantes con clase esta SEMANA" },
  { value: "all_active", label: "TODOS los estudiantes activos" },
  { value: "by_level", label: "Por NIVEL (A1, A2, B1, B2, C1, C2)" },
  { value: "by_lab", label: "Inscritos a una CLASE específica" },
];

const ALL_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

function fmtAudience(a: AnnouncementRow): string {
  const map: Record<string, string> = {
    today: "Clase hoy",
    this_week: "Clase esta semana",
    all_active: "Todos activos",
    by_level: `Niveles: ${a.audienceConfig?.levels?.join(", ") || "?"}`,
    by_lab: `Lab específico`,
  };
  return map[a.audienceType] || a.audienceType;
}

// ── Main component ───────────────────────────────────────────────────────
export default function AnnouncementsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("new");

  // Editor state
  const [templateKey, setTemplateKey] = useState("memorial_day");
  const [subject, setSubject] = useState(TEMPLATES[0].subject);
  const [body, setBody] = useState(TEMPLATES[0].body);
  const [audience, setAudience] = useState("today");
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<string>("");

  // UI state
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [visualPreviewOpen, setVisualPreviewOpen] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<SendResponse | null>(null);

  const visualBody = body.replace(/\{\{firstName\}\}/g, "María");

  // ── History tab data ──────────────────────────────────────────────────
  const { data: historyData, isLoading: historyLoading } = useQuery<{ announcements: AnnouncementRow[] }>({
    queryKey: ["/api/admin/announcements"],
    enabled: tab === "history",
  });

  // ── Lab list for by_lab audience ──────────────────────────────────────
  const { data: labsData } = useQuery<{ labs: LabOption[] }>({
    queryKey: ["/api/admin/labs/list-for-announcement"],
    enabled: audience === "by_lab",
  });

  // ── Handlers ──────────────────────────────────────────────────────────
  function applyTemplate(key: string) {
    setTemplateKey(key);
    const t = TEMPLATES.find((x) => x.key === key);
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
      setPreview(null);
    }
  }

  function toggleLevel(lvl: string) {
    setSelectedLevels((prev) =>
      prev.includes(lvl) ? prev.filter((x) => x !== lvl) : [...prev, lvl]
    );
    setPreview(null);
  }

  function buildAudienceConfig() {
    if (audience === "by_level") return { levels: selectedLevels };
    if (audience === "by_lab") return { labId: selectedLabId };
    return undefined;
  }

  function validateAudience(): string | null {
    if (audience === "by_level" && selectedLevels.length === 0) {
      return "Selecciona al menos un nivel";
    }
    if (audience === "by_lab" && !selectedLabId) {
      return "Selecciona una clase específica";
    }
    return null;
  }

  async function handlePreview() {
    const err = validateAudience();
    if (err) {
      toast({ title: "Falta configuración", description: err, variant: "destructive" });
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast({ title: "Falta contenido", description: "Asunto y cuerpo son requeridos", variant: "destructive" });
      return;
    }
    setIsPreviewing(true);
    setPreview(null);
    setLastResult(null);
    try {
      const res = await apiRequest("POST", "/api/admin/announce-class-change", {
        subject,
        htmlBody: body,
        audience,
        audienceConfig: buildAudienceConfig(),
        template: templateKey,
        dryRun: true,
      });
      const data = await res.json();
      setPreview(data);
      if (data.recipientCount === 0) {
        toast({
          title: "0 destinatarios",
          description: "Nadie coincide con esta audiencia. Prueba otra opción.",
        });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Falló el preview", variant: "destructive" });
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleSendConfirmed() {
    setConfirmOpen(false);
    setIsSending(true);
    try {
      const res = await apiRequest("POST", "/api/admin/announce-class-change", {
        subject,
        htmlBody: body,
        audience,
        audienceConfig: buildAudienceConfig(),
        template: templateKey,
        dryRun: false,
      });
      const data = await res.json();
      setLastResult(data);
      toast({
        title: `Enviado: ${data.sent} ✓ / ${data.failed} ✗`,
        description: data.failed > 0
          ? `${data.failed} correos fallaron — revisa los detalles abajo.`
          : `Todos los ${data.sent} correos salieron exitosamente.`,
        variant: data.failed > 0 ? "destructive" : "default",
      });
      // Refresh history so the new send appears in the Historial tab
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Falló el envío", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  }

  function duplicateFromHistory(row: AnnouncementRow) {
    setSubject(row.subject);
    setBody(row.htmlBody);
    setAudience(row.audienceType);
    if (row.audienceType === "by_level" && Array.isArray(row.audienceConfig?.levels)) {
      setSelectedLevels(row.audienceConfig.levels);
    }
    if (row.audienceType === "by_lab" && row.audienceConfig?.labId) {
      setSelectedLabId(row.audienceConfig.labId);
    }
    setTemplateKey(row.template || "blank");
    setPreview(null);
    setLastResult(null);
    setTab("new");
    toast({ title: "Plantilla cargada", description: "Modifica lo que necesites y envía." });
  }

  const audienceLabel = AUDIENCE_OPTIONS.find((a) => a.value === audience)?.label || audience;

  return (
    <AdminLayout title="Anuncios">
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-display uppercase">Anuncios</h1>
          </div>
          <p className="font-mono text-sm text-muted-foreground">
            Envía correos a tus estudiantes y revisa el historial de anuncios anteriores.
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="new" data-testid="tab-new">
              <Plus className="w-4 h-4 mr-2" /> Nuevo Anuncio
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              <History className="w-4 h-4 mr-2" /> Historial
            </TabsTrigger>
          </TabsList>

          {/* ── NEW ANNOUNCEMENT TAB ── */}
          <TabsContent value="new" className="space-y-6">
            <Card className="p-5">
              <Label className="font-mono text-xs uppercase mb-2 block">Plantilla</Label>
              <div className="flex gap-2 flex-wrap">
                {TEMPLATES.map((t) => (
                  <Button
                    key={t.key}
                    size="sm"
                    variant={templateKey === t.key ? "default" : "outline"}
                    onClick={() => applyTemplate(t.key)}
                    data-testid={`template-${t.key}`}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </Card>

            <Card className="p-5 space-y-4">
              <div>
                <Label htmlFor="subject" className="font-mono text-xs uppercase mb-1.5 block">
                  Asunto del correo
                </Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ej: Hoy no hay clase — Memorial Day"
                  data-testid="input-subject"
                />
              </div>

              <div>
                <Label htmlFor="body" className="font-mono text-xs uppercase mb-1.5 block">
                  Cuerpo (HTML — usa <code>{"{{firstName}}"}</code> para personalizar con el nombre del estudiante)
                </Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  className="font-mono text-xs"
                  data-testid="textarea-body"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {body.length} caracteres · Desde <code>info@inscripciones.cogniboost.co</code> · reply-to <code>clozano@cognimight.com</code>
                </p>
              </div>

              {/* Audience selector */}
              <div>
                <Label className="font-mono text-xs uppercase mb-1.5 block">Audiencia</Label>
                <Select value={audience} onValueChange={(v) => { setAudience(v); setPreview(null); }}>
                  <SelectTrigger data-testid="select-audience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIENCE_OPTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* by_level: multi-select levels */}
              {audience === "by_level" && (
                <div className="rounded border border-border p-4 bg-muted/30">
                  <Label className="font-mono text-xs uppercase mb-3 block">Selecciona los niveles</Label>
                  <div className="flex gap-3 flex-wrap">
                    {ALL_LEVELS.map((lvl) => (
                      <label
                        key={lvl}
                        className="flex items-center gap-2 px-3 py-2 border border-border rounded bg-background cursor-pointer hover-elevate"
                        data-testid={`level-${lvl}`}
                      >
                        <Checkbox
                          checked={selectedLevels.includes(lvl)}
                          onCheckedChange={() => toggleLevel(lvl)}
                        />
                        <span className="font-mono font-bold">{lvl}</span>
                      </label>
                    ))}
                  </div>
                  {selectedLevels.length > 0 && (
                    <p className="text-xs font-mono text-muted-foreground mt-2">
                      Seleccionado: {selectedLevels.join(", ")}
                    </p>
                  )}
                </div>
              )}

              {/* by_lab: select specific lab */}
              {audience === "by_lab" && (
                <div className="rounded border border-border p-4 bg-muted/30">
                  <Label className="font-mono text-xs uppercase mb-2 block">Selecciona la clase</Label>
                  <Select value={selectedLabId} onValueChange={(v) => { setSelectedLabId(v); setPreview(null); }}>
                    <SelectTrigger data-testid="select-lab">
                      <SelectValue placeholder="Próximas clases..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(labsData?.labs || []).length === 0 && (
                        <div className="p-2 text-sm text-muted-foreground">No hay clases próximas</div>
                      )}
                      {(labsData?.labs || []).map((lab) => (
                        <SelectItem key={lab.id} value={lab.id}>
                          {lab.title} · {lab.level} · {new Date(lab.scheduledAt).toLocaleDateString("es")} · {lab.registrationCount} inscritos
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-2 pt-2 flex-wrap">
                <Button onClick={() => setVisualPreviewOpen(true)} variant="outline" data-testid="button-visual-preview">
                  <Monitor className="w-4 h-4 mr-2" />
                  Ver cómo se ve
                </Button>
                <Button onClick={handlePreview} disabled={isPreviewing || isSending} variant="outline" data-testid="button-preview">
                  {isPreviewing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Buscando...</> : <><Eye className="w-4 h-4 mr-2" />Ver destinatarios</>}
                </Button>
                <Button onClick={() => setConfirmOpen(true)} disabled={!preview || preview.recipientCount === 0 || isSending} data-testid="button-send">
                  {isSending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</> : <><Send className="w-4 h-4 mr-2" />Enviar a {preview?.recipientCount || 0} estudiantes</>}
                </Button>
              </div>
            </Card>

            {preview && (
              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display text-lg uppercase flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Vista previa de destinatarios
                  </h2>
                  <Badge>{preview.recipientCount} estudiante{preview.recipientCount === 1 ? "" : "s"}</Badge>
                </div>
                <p className="text-sm font-mono text-muted-foreground mb-3">
                  Audiencia: <strong>{audienceLabel}</strong>
                </p>
                {preview.recipientCount === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nadie coincide con esta audiencia.</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto border border-border rounded">
                    <table className="w-full text-xs font-mono">
                      <thead className="bg-muted/30 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2">Nombre</th>
                          <th className="text-left px-3 py-2">Email</th>
                          <th className="text-left px-3 py-2">Origen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.recipients.map((r) => (
                          <tr key={r.userId} className="border-t border-border">
                            <td className="px-3 py-1.5">{r.firstName || "—"}</td>
                            <td className="px-3 py-1.5">{r.email}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{r.source}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            {lastResult && (
              <Card className="p-5">
                <h2 className="font-display text-lg uppercase mb-3 flex items-center gap-2">
                  {lastResult.failed === 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-destructive" />}
                  Resultado del envío
                </h2>
                <div className="flex gap-4 mb-3">
                  <Badge variant="default">{lastResult.sent} enviados</Badge>
                  {lastResult.failed > 0 && <Badge variant="destructive">{lastResult.failed} fallidos</Badge>}
                </div>
                {lastResult.failures.length > 0 && (
                  <ul className="text-xs space-y-1 font-mono">
                    {lastResult.failures.map((f, i) => (
                      <li key={i}><strong>{f.email}</strong> — {f.error}</li>
                    ))}
                  </ul>
                )}
              </Card>
            )}
          </TabsContent>

          {/* ── HISTORY TAB ── */}
          <TabsContent value="history">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg uppercase flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Anuncios anteriores
                </h2>
                {historyData?.announcements && (
                  <Badge variant="outline">{historyData.announcements.length} anuncios</Badge>
                )}
              </div>

              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : !historyData?.announcements || historyData.announcements.length === 0 ? (
                <div className="py-12 text-center">
                  <Mail className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm font-mono text-muted-foreground">
                    Aún no has enviado ningún anuncio. Cuando envíes uno aparecerá aquí.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyData.announcements.map((row) => (
                    <div key={row.id} className="border border-border rounded p-4 hover-elevate" data-testid={`history-${row.id}`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-display text-sm truncate">{row.subject}</h3>
                          <p className="text-xs font-mono text-muted-foreground mt-0.5">
                            {new Date(row.sentAt).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => duplicateFromHistory(row)} data-testid={`duplicate-${row.id}`}>
                          <Copy className="w-3 h-3 mr-1" /> Duplicar
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <Badge variant="outline" className="font-mono">{fmtAudience(row)}</Badge>
                        <Badge variant="default" className="font-mono">{row.sentCount} enviados</Badge>
                        {row.failedCount > 0 && (
                          <Badge variant="destructive" className="font-mono">{row.failedCount} fallidos</Badge>
                        )}
                        {row.template && (
                          <Badge variant="secondary" className="font-mono">{row.template}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Visual email preview modal */}
        <Dialog open={visualPreviewOpen} onOpenChange={setVisualPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
              <DialogTitle className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                Vista previa del correo
                <Badge variant="outline" className="ml-2 font-mono text-xs">
                  Como lo verá una estudiante llamada "María"
                </Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="bg-[#F5F8FB] overflow-y-auto" style={{ maxHeight: "calc(90vh - 80px)" }}>
              <div className="px-6 py-3 bg-white border-b border-border text-xs font-mono">
                <div><strong>De:</strong> info@inscripciones.cogniboost.co</div>
                <div><strong>Para:</strong> maria@ejemplo.com</div>
                <div><strong>Responder a:</strong> clozano@cognimight.com</div>
                <div><strong>Asunto:</strong> {subject || "(sin asunto)"}</div>
              </div>
              <iframe
                title="Email preview"
                srcDoc={visualBody}
                style={{ width: "100%", minHeight: "700px", border: "none", background: "#F5F8FB" }}
                sandbox=""
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirmation dialog */}
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Enviar a {preview?.recipientCount} estudiantes?</AlertDialogTitle>
              <AlertDialogDescription>
                Se enviará el correo "<strong>{subject}</strong>" a {preview?.recipientCount} estudiante(s) de la audiencia "{audienceLabel}". Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleSendConfirmed} data-testid="button-confirm-send">
                Sí, enviar ahora
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
