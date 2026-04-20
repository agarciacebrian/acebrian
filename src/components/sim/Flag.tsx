import { cn } from "@/lib/utils";

export function Flag({ emoji, name, className }: { emoji: string; name?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="text-base leading-none" aria-hidden>
        {emoji}
      </span>
      {name && <span className="font-mono text-xs">{name}</span>}
    </span>
  );
}
