import { cn } from "@/lib/utils";

interface Props {
  value: number; // 0-100
  category?: "macro" | "energy" | "defense" | "cyber" | "soft" | "social" | "strategic";
  height?: number;
  showValue?: boolean;
  className?: string;
}

export function Bar({ value, category = "macro", height = 6, showValue = false, className }: Props) {
  const pct = Math.max(0, Math.min(100, value));
  const color = `var(--color-cat-${category})`;
  return (
    <div className={cn("flex items-center gap-2 w-full", className)}>
      <div
        className="flex-1 rounded-sm overflow-hidden bg-muted/40 relative"
        style={{ height }}
      >
        <div
          className="h-full transition-all"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, color-mix(in oklab, ${color} 70%, transparent), ${color})`,
          }}
        />
      </div>
      {showValue && (
        <span className="metric text-xs w-9 text-right text-muted-foreground">{pct.toFixed(0)}</span>
      )}
    </div>
  );
}
