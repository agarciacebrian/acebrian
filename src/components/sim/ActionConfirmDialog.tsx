import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimeUnit = "days" | "weeks" | "months";
export interface TimeAdvance { unit: TimeUnit; amount: number }

interface Props {
  open: boolean;
  gameId: string;
  action: string;
  onCancel: () => void;
  onConfirm: (ta: TimeAdvance) => void;
  submitting?: boolean;
}

interface Preset { unit: TimeUnit; amount: number; label: string }

const PRESETS: Preset[] = [
  { unit: "days",   amount: 1,  label: "1 día" },
  { unit: "days",   amount: 3,  label: "3 días" },
  { unit: "weeks",  amount: 1,  label: "1 semana" },
  { unit: "weeks",  amount: 2,  label: "2 semanas" },
  { unit: "months", amount: 1,  label: "1 mes" },
  { unit: "months", amount: 3,  label: "1 trimestre" },
];

function eq(a: TimeAdvance, b: TimeAdvance) {
  return a.unit === b.unit && a.amount === b.amount;
}

function fmt(ta: TimeAdvance) {
  const u = ta.unit === "days" ? (ta.amount === 1 ? "día" : "días")
          : ta.unit === "weeks" ? (ta.amount === 1 ? "semana" : "semanas")
          : (ta.amount === 1 ? "mes" : "meses");
  if (ta.unit === "months" && ta.amount === 3) return "1 trimestre";
  return `${ta.amount} ${u}`;
}

export function ActionConfirmDialog({ open, gameId, action, onCancel, onConfirm, submitting }: Props) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [proposed, setProposed] = useState<TimeAdvance | null>(null);
  const [selected, setSelected] = useState<TimeAdvance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setLoading(false); setReason(""); setProposed(null); setSelected(null); setError(null);
      return;
    }
    void propose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const propose = async () => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("game-propose-duration", {
        body: { gameId, action },
      });
      if (error) {
        const ctx = (error as any)?.context;
        let msg = error.message;
        if (ctx && typeof ctx.json === "function") {
          try { const j = await ctx.json(); if (j?.error) msg = j.error; } catch {}
        }
        setError(msg ?? "Error proponiendo duración");
        // Fallback: trimestre
        const fb: TimeAdvance = { unit: "months", amount: 3 };
        setProposed(fb); setSelected(fb);
      } else {
        const ta: TimeAdvance = {
          unit: (data?.unit as TimeUnit) ?? "months",
          amount: Number(data?.amount) || 3,
        };
        setProposed(ta); setSelected(ta);
        setReason(typeof data?.reason === "string" ? data.reason : "");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !submitting) onCancel(); }}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="border-b border-border-strong p-3">
          <DialogTitle className="font-mono text-sm uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Confirmar avance de tiempo
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          <div>
            <div className="text-[0.6rem] font-mono uppercase tracking-wider text-muted-foreground mb-1">
              Orden
            </div>
            <div className="font-mono text-xs leading-relaxed bg-muted/30 border border-border rounded p-2 max-h-24 overflow-y-auto whitespace-pre-wrap">
              {action}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono py-4 justify-center">
              <Loader2 className="h-3 w-3 animate-spin" /> Estimando duración realista…
            </div>
          ) : (
            <>
              {proposed && (
                <div className="border border-primary/40 bg-primary/5 rounded p-2.5 space-y-1">
                  <div className="text-[0.6rem] font-mono uppercase tracking-wider text-primary">
                    Propuesta de la IA: {fmt(proposed)}
                  </div>
                  {reason && (
                    <div className="font-mono text-[0.7rem] text-muted-foreground leading-relaxed">
                      {reason}
                    </div>
                  )}
                  {error && (
                    <div className="font-mono text-[0.65rem] text-[color:var(--warning)]">
                      ⚠ {error} · Se usa fallback (1 trimestre).
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="text-[0.6rem] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                  Ajustar duración
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {PRESETS.map((p) => {
                    const isSel = selected ? eq(selected, p) : false;
                    const isProp = proposed ? eq(proposed, p) : false;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setSelected({ unit: p.unit, amount: p.amount })}
                        className={cn(
                          "font-mono text-[0.7rem] px-2 py-1.5 rounded border transition-colors text-center relative",
                          isSel
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border hover:border-primary/50 hover:bg-muted/40"
                        )}
                      >
                        {p.label}
                        {isProp && (
                          <span className="absolute -top-1 -right-1 text-[0.5rem] bg-primary text-primary-foreground rounded-full px-1 leading-none py-[1px]">
                            IA
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="border-t border-border-strong p-3 flex-row justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected || loading || submitting}
            className="font-mono uppercase tracking-wider"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="ml-2">Ejecutar · {selected ? fmt(selected) : "—"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
