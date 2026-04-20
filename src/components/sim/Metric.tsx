import { fmtDelta, fmtRank } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  rank?: number | null;
  rankDelta?: number | null;
  hint?: string;
  tone?: "default" | "good" | "bad" | "warn";
}

export function Metric({ label, value, unit, rank, rankDelta, hint, tone = "default" }: Props) {
  const delta = fmtDelta(rankDelta ?? null);
  const toneClass = {
    default: "text-foreground",
    good: "text-[color:var(--success)]",
    bad: "text-destructive",
    warn: "text-[color:var(--warning)]",
  }[tone];
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2 border-r border-border last:border-r-0 min-w-0">
      <div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground truncate">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={cn("metric text-xl leading-none", toneClass)}>{value}</span>
        {unit && <span className="text-xs text-muted-foreground font-mono">{unit}</span>}
      </div>
      {(rank !== undefined && rank !== null) && (
        <div className="flex items-center gap-1.5 text-[0.65rem] font-mono">
          <span className="text-muted-foreground">RK</span>
          <span className="text-foreground">{fmtRank(rank)}</span>
          <span
            className={cn(
              delta.tone === "up" && "text-[color:var(--success)]",
              delta.tone === "down" && "text-destructive",
              delta.tone === "flat" && "text-muted-foreground"
            )}
          >
            {delta.text}
          </span>
        </div>
      )}
      {hint && !rank && (
        <div className="text-[0.65rem] text-muted-foreground font-mono truncate">{hint}</div>
      )}
    </div>
  );
}
