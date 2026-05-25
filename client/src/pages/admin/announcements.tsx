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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mail,
  Eye,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Monitor,
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
// Email HTML uses table-based layout + inline CSS (Outlook/Gmail compat).
// Brand: primary #667EEB · accent #F5AE56 · navy #1B1B41 · off-white #F5F8FB

const EMAIL_BASE = (innerBody: string) => `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CogniBoost</title>
</head>
<body style="margin:0;padding:0;background:#F5F8FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1B1B41;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F5F8FB;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(27,27,65,0.06);">
          <!-- Header / Wordmark -->
          <tr>
            <td style="background:#FFFFFF;padding:24px 32px 16px 32px;border-bottom:1px solid #EEF1F7;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#1B1B41;text-transform:uppercase;">
                    Cogni<span style="color:#667EEB;">boost</span>
                  </td>
                  <td align="right" style="font-size:11px;letter-spacing:2px;color:#8B8FA8;text-transform:uppercase;font-weight:600;">
                    ESL Academy
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${innerBody}
          <!-- Footer -->
          <tr>
            <td style="background:#F5F8FB;padding:24px 32px;border-top:1px solid #EEF1F7;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:13px;color:#1B1B41;font-weight:600;">CogniBoost ESL Academy</p>
              <p style="margin:0;font-size:11px;color:#8B8FA8;line-height:1.6;">
                Conviértete en un hablante de inglés seguro y fluido.<br />
                <a href="https://cogniboost.co" style="color:#667EEB;text-decoration:none;font-weight:600;">cogniboost.co</a> &nbsp;·&nbsp;
                <a href="mailto:clozano@cognimight.com" style="color:#667EEB;text-decoration:none;">Contactar</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0;font-size:11px;color:#8B8FA8;text-align:center;">
          Recibiste este correo porque eres estudiante activo de CogniBoost.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

const MEMORIAL_DAY_INNER = `
<!-- Hero -->
<tr>
  <td style="background:linear-gradient(135deg,#1B1B41 0%,#2A2D5C 100%);padding:36px 32px;text-align:center;">
    <p style="margin:0 0 8px 0;font-size:36px;line-height:1;">🇺🇸</p>
    <h1 style="margin:0 0 6px 0;font-size:26px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">
      Memorial Day
    </h1>
    <p style="margin:0;font-size:14px;color:#F5AE56;font-weight:600;text-transform:uppercase;letter-spacing:2px;">
      Hoy no hay clase en vivo
    </p>
  </td>
</tr>

<!-- Body -->
<tr>
  <td style="padding:36px 32px 24px 32px;">
    <p style="margin:0 0 18px 0;font-size:16px;line-height:1.6;color:#1B1B41;">
      Hola <strong>{{firstName}}</strong>,
    </p>
    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#3A3D5C;">
      Hoy es <strong>Memorial Day</strong> en Estados Unidos &mdash; un día festivo nacional donde se honra a los soldados que murieron sirviendo al país. Por eso <strong>hoy no tendremos clase en vivo</strong>.
    </p>

    <!-- English Tip Callout -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
      <tr>
        <td style="background:#FFF8EE;border-left:4px solid #F5AE56;border-radius:6px;padding:18px 20px;">
          <p style="margin:0 0 8px 0;font-size:11px;color:#C97D1E;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">
            💡 English tip del día
          </p>
          <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#1B1B41;">
            "Memorial Day" <strong>no</strong> se traduce como "Día de los Muertos" &mdash; son cosas totalmente diferentes.
          </p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#1B1B41;font-style:italic;">
            Si quieres impresionar a alguien hoy, di: <strong>"Memorial Day honors fallen soldiers."</strong>
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#3A3D5C;">
      Mientras tanto la plataforma está abierta. Puedes:
    </p>

    <!-- Action items -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td style="padding:12px 16px;background:#F5F8FB;border-radius:8px;margin-bottom:8px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td width="32" style="font-size:18px;vertical-align:middle;">📚</td>
              <td style="font-size:14px;color:#1B1B41;vertical-align:middle;">Avanza en las lecciones grabadas de tu nivel</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td height="8" style="line-height:8px;font-size:0;">&nbsp;</td></tr>
      <tr>
        <td style="padding:12px 16px;background:#F5F8FB;border-radius:8px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td width="32" style="font-size:18px;vertical-align:middle;">✍️</td>
              <td style="font-size:14px;color:#1B1B41;vertical-align:middle;">Entrega un proyecto de escritura</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td height="8" style="line-height:8px;font-size:0;">&nbsp;</td></tr>
      <tr>
        <td style="padding:12px 16px;background:#F5F8FB;border-radius:8px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td width="32" style="font-size:18px;vertical-align:middle;">🎙️</td>
              <td style="font-size:14px;color:#1B1B41;vertical-align:middle;">Graba un speaking project</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td height="8" style="line-height:8px;font-size:0;">&nbsp;</td></tr>
      <tr>
        <td style="padding:12px 16px;background:#F5F8FB;border-radius:8px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td width="32" style="font-size:18px;vertical-align:middle;">📖</td>
              <td style="font-size:14px;color:#1B1B41;vertical-align:middle;">Repasa tu vocabulario activo</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td align="center">
          <a href="https://cogniboost.co/dashboard" style="display:inline-block;background:#667EEB;color:#FFFFFF;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:0.3px;">
            Ir a mi dashboard &rarr;
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:24px 0 0 0;font-size:15px;line-height:1.6;color:#3A3D5C;">
      Mañana martes volvemos a las clases en vivo. <strong>¡Disfruta tu lunes!</strong>
    </p>

    <p style="margin:24px 0 0 0;font-size:15px;line-height:1.6;color:#1B1B41;">
      Un abrazo,<br />
      <strong style="color:#667EEB;">Coral Lozano</strong><br />
      <span style="font-size:13px;color:#8B8FA8;">Directora Académica · CogniBoost</span>
    </p>
  </td>
</tr>`;

const SNOW_DAY_INNER = `
<tr>
  <td style="background:#1B1B41;padding:32px;text-align:center;">
    <p style="margin:0 0 8px 0;font-size:32px;">📣</p>
    <h1 style="margin:0;font-size:22px;font-weight:800;color:#FFFFFF;">Clase cancelada hoy</h1>
  </td>
</tr>
<tr>
  <td style="padding:32px;">
    <p style="margin:0 0 16px 0;font-size:16px;color:#1B1B41;">Hola <strong>{{firstName}}</strong>,</p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#3A3D5C;">
      Por motivos imprevistos <strong>la clase en vivo de hoy queda cancelada</strong>. Te avisaremos por correo cuando se reagende.
    </p>
    <p style="margin:0 0 24px 0;font-size:15px;line-height:1.7;color:#3A3D5C;">
      Mientras tanto, recuerda que la plataforma está disponible 24/7 para que sigas practicando.
    </p>
    <p style="margin:0;font-size:15px;color:#1B1B41;">
      Un abrazo,<br /><strong style="color:#667EEB;">Coral</strong><br />
      <span style="font-size:13px;color:#8B8FA8;">CogniBoost ESL Academy</span>
    </p>
  </td>
</tr>`;

const MEMORIAL_DAY_TEMPLATE = {
  subject: "Hoy no hay clase — Memorial Day 🇺🇸",
  body: EMAIL_BASE(MEMORIAL_DAY_INNER),
};

const SNOW_DAY_TEMPLATE = {
  subject: "Clase cancelada hoy — nos vemos pronto",
  body: EMAIL_BASE(SNOW_DAY_INNER),
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
  const [visualPreviewOpen, setVisualPreviewOpen] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<SendResponse | null>(null);

  // Render-time replacement so visual preview shows what the student will see
  const visualBody = body.replace(/\{\{firstName\}\}/g, "María");

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

          <div className="flex gap-2 pt-2 flex-wrap">
            <Button
              onClick={() => setVisualPreviewOpen(true)}
              variant="outline"
              data-testid="button-visual-preview"
            >
              <Monitor className="w-4 h-4 mr-2" />
              Ver cómo se ve el correo
            </Button>
            <Button
              onClick={handlePreview}
              disabled={isPreviewing || isSending}
              variant="outline"
              data-testid="button-preview"
            >
              {isPreviewing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Buscando destinatarios...</>
              ) : (
                <><Eye className="w-4 h-4 mr-2" />Ver destinatarios</>
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

        {/* Visual email preview — iframe so the email HTML is fully isolated */}
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
                style={{
                  width: "100%",
                  minHeight: "700px",
                  border: "none",
                  background: "#F5F8FB",
                }}
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
