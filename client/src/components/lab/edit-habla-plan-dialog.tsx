/**
 * Shared edit dialog for HABLA Lab Plans. Used in both the Library
 * (teacher daily view) and the admin /admin/labs/plans page.
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Save } from "lucide-react";

export interface HablaPlan {
  id: string;
  variantNumber: number;
  title: string;
  grammarFocus: string;
  pedagogicalObjective: string;
  previewBlurb: string | null;
  plan: any;
  vocabulary?: string[];
  expressions?: string[];
  isPublished: boolean;
}

interface Props {
  plan: HablaPlan;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function EditHablaPlanDialog({ plan, open, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(plan.title);
  const [grammarFocus, setGrammarFocus] = useState(plan.grammarFocus);
  const [objective, setObjective] = useState(plan.pedagogicalObjective);
  const [previewBlurb, setPreviewBlurb] = useState(plan.previewBlurb || "");
  const [planJson, setPlanJson] = useState(JSON.stringify(plan.plan, null, 2));
  const { toast } = useToast();

  const save = useMutation({
    mutationFn: async () => {
      let parsedPlan: any;
      try { parsedPlan = JSON.parse(planJson); } catch (err: any) {
        throw new Error("Plan JSON invalid: " + err?.message);
      }
      const r = await apiRequest("PATCH", `/api/admin/lab-plans/${plan.id}`, {
        title, grammarFocus, pedagogicalObjective: objective, previewBlurb, plan: parsedPlan,
      });
      return r.json();
    },
    onSuccess: () => { toast({ title: "Plan saved" }); onSaved?.(); onClose(); },
    onError: (e: any) => toast({ title: "Save failed", description: e?.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Plan · Variant {plan.variantNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Grammar focus</Label>
            <Input value={grammarFocus} onChange={(e) => setGrammarFocus(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Pedagogical objective</Label>
            <Textarea value={objective} onChange={(e) => setObjective(e.target.value)} className="min-h-[60px]" />
          </div>
          <div>
            <Label className="text-xs">Preview blurb (pre-class email)</Label>
            <Textarea value={previewBlurb} onChange={(e) => setPreviewBlurb(e.target.value)} className="min-h-[60px]" />
          </div>
          <div>
            <Label className="text-xs">5-Phase plan (JSON)</Label>
            <Textarea
              value={planJson}
              onChange={(e) => setPlanJson(e.target.value)}
              className="min-h-[280px] font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Edit phase content here. Keep keys: hook, activate, build, live, anchor.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              <Save className="w-4 h-4 mr-1.5" />
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
