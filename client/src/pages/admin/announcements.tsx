/**
 * Admin · Announcements
 *
 * Lets Coral send a class-change / holiday announcement email to the right
 * audience without going to Resend dashboard. Always previews recipients
 * (dry-run) before sending — explicit "Send Now" requires confirmation.
 *
 * Templates ship prefilled (Memorial Day, snow day, instructor-out, etc.)
 * and are editable before sending.
 */

import { useState } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

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

// ── Templates ────────────────────────────────────────────────────────────
const MEMORIAL_DAY_TEMPLATE = {
  subject: "Hoy no hay clase — Memorial Day 🇺🇸",
  body: `<p>Hola {{firstName}},</p>

<p>Te escribimos para recordarte que <strong>hoy lunes 25 de mayo es Memorial Day</strong> en Estados Unidos, así que <strong>no tendremos clase en vivo hoy</strong>.</p>

<p>La plataforma sigue disponible — puedes:</p>
<ul>
  <li>Avanzar en las lecciones grabadas de tu nivel</li>
  <li>Practicar con los proyectos de escritura y habla</li>
  <li>Repasar vocabulario</li>
</ul>

<p>Volvemos a las clases en vivo <strong>mañana martes</strong> con todo. ¡Disfruta tu día!</p>

<p>Un abrazo,<br>
<strong>Coral</strong><br>
Directora Académica<br>
CogniBoost ESL Academy</p>`,
};

const SNOW_DAY_TEMPLATE = {
  subject: "Clase cancelada hoy — nos vemos pronto",
  body: `<p>Hola {{firstName}},</p>

<p>Por motivos imprevistos <strong>la clase en vivo de hoy queda cancelada</strong>. Te avisaremos por correo cuando se reagende.</p>

<p>Mientras tanto, recuerda que la plataforma está disponible 24/7 para que sigas practicando.</p>

<p>Un abrazo,<br>
<strong>Coral</strong><br>
CogniBoost ESL Academy</p>`,
};

const TEMPLATES = [
  { key: "memorial_day", label: "Memorial Day (hoy)", ...MEMORIAL_DAY_TEMPLATE },
  { key: "snow_day", label: "Cancelación de clase", ...SNOW_DAY_TEMPLATE },
  { key: "blank", label: "En blanco", subject: "", body: "" },
];

const AUDIENCE_OPTIONS = [
  { value: "today", label: "Estudiantes con clase HOY" },
  { value: "this_week", label: "Estudiantes con clase esta SEMANA" },
  { value: "all_active", label: "TODOS los estudiantes activos (de pago)" },
];

export default function AnnouncementsPage() {
  const { toast } = useToast();
  const [templateKey, setTemplateKey] = useState("memorial_day");
  const [subject, setSubject] = useState(MEMORIAL_DAY_TEMPLATE.subject);
  const [body, setBody] = useState(MEMORIAL_DAY_TEMPLATE.body);
  const [audience, setAudience] = useState("today");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<SendResponse | null>(null);

  function applyTemplate(key: string) {
    setTemplateKey(key);
    const t = TEMPLATES.find((x) => x.key === key);
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
      setPreview(null); // recipients depend on audience, not template, but reset for clarity
    }
  }

  async function handlePreview() {
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
        dryRun: true,
      });
      const data = await res.json();
      setPreview(data);
      if (data.recipientCount === 0) {
        toast({
          title: "0 destinatarios",
          description:
            audience === "today"
              ? "Nadie tiene clase reservada para hoy. Prueba 'esta semana' o 'todos activos'."
              : "Ningún estudiante coincide con esta audiencia.",
        });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Falló el preview", variant: "destructive" });
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
        dryRun: false,
      });
      const data = await res.json();
      setLastResult(data);
      toast({
        title: `Enviado: ${data.sent} ✓ / ${data.failed} ✗`,
        description:
          data.failed > 0
            ? `${data.failed} correos fallaron — revisa los detalles abajo.`
            : `Todos los ${data.sent} correos salieron exitosamente.`,
        variant: data.failed > 0 ? "destructive" : "default",
      });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Falló el envío", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  }

  const audienceLabel = AUDIENCE_OPTIONS.find((a) => a.value === audience)?.label || audience;

  return (
    <AdminLayout title="Anuncios · Cambios de clase">
      <div className="max-w-4xl mx-auto space-y-6 p-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-display uppercase">Enviar anuncio</h1>
          </div>
          <p className="font-mono text-sm text-muted-foreground">
            Avisa a los estudiantes cuando se cancele o cambie una clase. Siempre previsualiza la lista de destinatarios antes de enviar.
          </p>
        </div>

        {/* Template picker */}
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

        {/* Form */}
        <Card className="p-5 space-y-4">
          <div>
            <Label htmlFor="subject" className="font-mono text-xs uppercase mb-1.5 block">
              Asunto del correo
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Hoy no hay clase — Memorial Day"
              data-testid="input-subject"
            />
          </div>

          <div>
            <Label htmlFor="body" className="font-mono text-xs uppercase mb-1.5 block">
              Cuerpo (HTML — usa <code>{"{{firstName}}"}</code> para personalizar)
            </Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className="font-mono text-xs"
              data-testid="textarea-body"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {body.length} caracteres · El correo se envía desde <code>info@inscripciones.cogniboost.co</code> con reply-to <code>clozano@cognimight.com</code>
            </p>
          </div>

          <div>
            <Label className="font-mono text-xs uppercase mb-1.5 block">Audiencia</Label>
            <Select value={audience} onValueChange={(v) => { setAudience(v); setPreview(null); }}>
              <SelectTrigger data-testid="select-audience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCE_OPTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handlePreview}
              disabled={isPreviewing || isSending}
              variant="outline"
              data-testid="button-preview"
            >
              {isPreviewing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Buscando destinatarios...</>
              ) : (
                <><Eye className="w-4 h-4 mr-2" />Previsualizar destinatarios</>
              )}
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!preview || preview.recipientCount === 0 || isSending}
              data-testid="button-send"
            >
              {isSending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" />Enviar a {preview?.recipientCount || 0} estudiantes</>
              )}
            </Button>
          </div>
        </Card>

        {/* Preview results */}
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
              <p className="text-sm text-muted-foreground italic">
                Nadie coincide con esta audiencia hoy mismo.
              </p>
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

        {/* Send results */}
        {lastResult && (
          <Card className="p-5">
            <h2 className="font-display text-lg uppercase mb-3 flex items-center gap-2">
              {lastResult.failed === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              Resultado del envío
            </h2>
            <div className="flex gap-4 mb-3">
              <Badge variant="default">{lastResult.sent} enviados</Badge>
              {lastResult.failed > 0 && (
                <Badge variant="destructive">{lastResult.failed} fallidos</Badge>
              )}
            </div>
            {lastResult.failures.length > 0 && (
              <div>
                <p className="text-xs font-mono uppercase mb-2 text-muted-foreground">Detalles de fallos:</p>
                <ul className="text-xs space-y-1">
                  {lastResult.failures.map((f, i) => (
                    <li key={i} className="font-mono">
                      <strong>{f.email}</strong> — {f.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

        {/* Confirmation dialog */}
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Enviar a {preview?.recipientCount} estudiantes?</AlertDialogTitle>
              <AlertDialogDescription>
                Se enviará el correo "<strong>{subject}</strong>" a {preview?.recipientCount} estudiante(s) de la audiencia "{audienceLabel}".
                Esta acción no se puede deshacer.
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
