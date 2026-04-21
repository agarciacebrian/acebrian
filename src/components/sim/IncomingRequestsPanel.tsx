import { Panel } from "@/components/sim/Panel";
import { Inbox, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

export interface IncomingRequest {
  id: string;
  actor_name: string;
  actor_flag: string | null;
  actor_role: string | null;
  request_type: string;
  urgency: string;
  topic: string;
  message: string;
  suggested_attendees: any;
  status: string;
  origin: string;
  created_at_turn: number;
}

interface Props {
  requests: IncomingRequest[];
  onAccept: (req: IncomingRequest) => void;
  onChanged: () => void;
}

const URGENCY_COLORS: Record<string, string> = {
  baja: "text-muted-foreground",
  normal: "text-primary",
  alta: "text-[color:var(--warning)]",
  critica: "text-[color:var(--danger)]",
};

const TYPE_LABELS: Record<string, string> = {
  reunion: "REUNIÓN",
  propuesta: "PROPUESTA",
  consulta: "CONSULTA",
  queja: "QUEJA",
};

export function IncomingRequestsPanel({ requests, onAccept, onChanged }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const pending = requests.filter((r) => r.status === "pendiente");

  const ignore = async (req: IncomingRequest) => {
    setBusyId(req.id);
    const { error } = await supabase
      .from("incoming_requests")
      .update({
        status: "ignorada",
        resolution_note: "Ignorada por el jefe de Estado",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", req.id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Ignorada: ${req.actor_name}`);
    onChanged();
  };

  return (
    <Panel
      title={`Solicitudes entrantes${pending.length ? ` · ${pending.length}` : ""}`}
      icon={<Inbox className="h-3 w-3" />}
    >
      {pending.length === 0 ? (
        <div className="p-4 text-center text-xs text-muted-foreground font-mono">
          Sin solicitudes pendientes.
        </div>
      ) : (
        <div className="divide-y divide-border max-h-[320px] overflow-y-auto">
          {pending.map((r) => (
            <div key={r.id} className="p-2.5 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {r.actor_flag && (
                      <span className="text-base leading-none">{r.actor_flag}</span>
                    )}
                    <span className="font-bold text-xs font-mono truncate">
                      {r.actor_name}
                    </span>
                    {r.actor_role && (
                      <span className="text-[0.55rem] font-mono text-muted-foreground truncate">
                        ({r.actor_role})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={cn(
                        "text-[0.55rem] font-mono uppercase tracking-wider font-bold",
                        URGENCY_COLORS[r.urgency] ?? "text-primary",
                      )}
                    >
                      {TYPE_LABELS[r.request_type] ?? r.request_type.toUpperCase()}
                    </span>
                    <span
                      className={cn(
                        "text-[0.55rem] font-mono uppercase",
                        URGENCY_COLORS[r.urgency] ?? "text-muted-foreground",
                      )}
                    >
                      · {r.urgency}
                    </span>
                    <span className="text-[0.55rem] font-mono text-muted-foreground flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      T{r.created_at_turn}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-[0.7rem] font-mono text-foreground/90 leading-snug">
                <div className="font-bold text-[0.65rem] uppercase text-muted-foreground tracking-wider">
                  {r.topic}
                </div>
                <div className="mt-0.5">{r.message}</div>
              </div>
              <div className="flex gap-1.5 pt-1">
                <Button
                  size="sm"
                  variant="default"
                  className="h-6 px-2 text-[0.6rem] font-mono uppercase"
                  disabled={busyId === r.id}
                  onClick={() => onAccept(r)}
                >
                  <Check className="h-3 w-3" />
                  Aceptar reunión
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[0.6rem] font-mono uppercase text-muted-foreground"
                  disabled={busyId === r.id}
                  onClick={() => ignore(r)}
                >
                  <X className="h-3 w-3" />
                  Ignorar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
