import { Panel } from "@/components/sim/Panel";
import { Calendar } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Meeting {
  id: string;
  organization: string;
  meeting_type: string;
  scheduled_date: string;
  status: string;
}

export function MeetingsPanel({ meetings }: { meetings: Meeting[] }) {
  return (
    <Panel title="Calendario diplomático" icon={<Calendar className="h-3 w-3" />}>
      {meetings.length === 0 ? (
        <div className="p-4 text-center text-xs text-muted-foreground font-mono">
          Sin reuniones programadas todavía.
        </div>
      ) : (
        <div className="divide-y divide-border max-h-[240px] overflow-y-auto">
          {meetings.map((m) => (
            <div key={m.id} className="p-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-xs font-mono">{m.organization}</div>
                <div className="text-[0.6rem] text-muted-foreground">{m.meeting_type}</div>
              </div>
              <div className="text-right">
                <div className="text-[0.65rem] font-mono">{fmtDate(m.scheduled_date)}</div>
                <div
                  className={cn(
                    "text-[0.55rem] font-mono uppercase tracking-wider",
                    m.status === "pendiente" && "text-[color:var(--warning)]",
                    m.status === "en_curso" && "text-primary",
                    m.status === "resuelta" && "text-muted-foreground"
                  )}
                >
                  {m.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
