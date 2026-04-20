import { Panel } from "@/components/sim/Panel";
import { Activity, Pause, Wrench, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Capability {
  id: string;
  name: string;
  category: string;
  status: string;
  description: string | null;
}

const STATUS_ICON: Record<string, { icon: any; color: string; label: string }> = {
  proyecto: { icon: Wrench, color: "text-muted-foreground", label: "Proyecto" },
  desarrollo: { icon: Wrench, color: "text-[color:var(--warning)]", label: "Desarrollo" },
  activa: { icon: CheckCircle2, color: "text-[color:var(--success)]", label: "Activa" },
  sabotaje: { icon: AlertCircle, color: "text-destructive", label: "Sabotaje" },
  crisis: { icon: AlertCircle, color: "text-destructive", label: "Crisis" },
  obsoleta: { icon: Pause, color: "text-muted-foreground", label: "Obsoleta" },
};

export function CapabilitiesPanel({ caps }: { caps: Capability[] }) {
  return (
    <Panel title="Capacidades operativas" icon={<Activity className="h-3 w-3" />}>
      {caps.length === 0 ? (
        <div className="p-4 text-center text-xs text-muted-foreground font-mono">
          Aún no hay capacidades desplegadas. Lo que firmes/construyas aparecerá aquí como vivo.
        </div>
      ) : (
        <div className="divide-y divide-border max-h-[280px] overflow-y-auto">
          {caps.map((c) => {
            const meta = STATUS_ICON[c.status] ?? STATUS_ICON.activa;
            const Icon = meta.icon;
            return (
              <div key={c.id} className="p-2.5 flex items-start gap-2">
                <Icon className={cn("h-3.5 w-3.5 mt-0.5", meta.color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-xs">{c.name}</div>
                    <span className={cn("text-[0.55rem] font-mono uppercase tracking-wider", meta.color)}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="text-[0.6rem] uppercase tracking-wider text-muted-foreground font-mono">
                    {c.category}
                  </div>
                  {c.description && (
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {c.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
