import { Panel } from "@/components/sim/Panel";
import { Flag } from "@/components/sim/Flag";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AlertTriangle, Globe, Sword, Trophy, Zap, FileText, Users } from "lucide-react";

interface Event {
  id: string;
  turn_number: number;
  lore_date: string;
  category: string;
  title: string;
  body: string;
  actors: any;
  severity: string;
}

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  world: { label: "Mundo", icon: Globe, color: "text-[color:var(--info)]" },
  frente: { label: "Frente", icon: Sword, color: "text-destructive" },
  hito: { label: "Hito", icon: Trophy, color: "text-[color:var(--success)]" },
  crisis: { label: "Crisis", icon: AlertTriangle, color: "text-destructive" },
  oportunidad: { label: "Oportunidad", icon: Zap, color: "text-[color:var(--warning)]" },
  accion_jugador: { label: "Tu acción", icon: Users, color: "text-primary" },
  evaluacion: { label: "Evaluación", icon: FileText, color: "text-[color:var(--cat-strategic)]" },
  reunion: { label: "Reunión", icon: Users, color: "text-[color:var(--cat-soft)]" },
};

export function EventsFeed({ events }: { events: Event[] }) {
  if (events.length === 0) {
    return (
      <Panel title="Tablero del turno" className="col-span-12">
        <div className="p-8 text-center text-muted-foreground font-mono text-sm">
          Aún no hay eventos. Realiza tu primera acción para arrancar el motor.
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Tablero del turno" className="col-span-12">
      <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
        {events.map((e) => {
          const meta = CATEGORY_META[e.category] ?? CATEGORY_META.world;
          const Icon = meta.icon;
          return (
            <div key={e.id} className="p-3 hover:bg-muted/30">
              <div className="flex items-start gap-3">
                <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", meta.color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-[0.6rem] font-mono uppercase tracking-wider", meta.color)}>
                      {meta.label}
                    </span>
                    <span className="text-[0.6rem] font-mono text-muted-foreground">
                      T{e.turn_number} · {fmtDate(e.lore_date)}
                    </span>
                    {e.severity === "critico" && (
                      <span className="text-[0.6rem] font-mono px-1.5 py-0.5 bg-destructive/20 text-destructive rounded">
                        CRÍTICO
                      </span>
                    )}
                    {e.severity === "grave" && (
                      <span className="text-[0.6rem] font-mono px-1.5 py-0.5 bg-[color:var(--warning)]/20 text-[color:var(--warning)] rounded">
                        GRAVE
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-sm mt-0.5">{e.title}</div>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap">
                    {e.body}
                  </p>
                  {Array.isArray(e.actors) && e.actors.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {e.actors.map((a: any, i: number) => (
                        <Flag key={i} emoji={a.flag ?? "🏳️"} name={a.name} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
