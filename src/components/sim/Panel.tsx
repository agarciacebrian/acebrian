import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  icon,
  right,
  children,
  className,
  category,
}: {
  title?: string;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  category?: "macro" | "energy" | "defense" | "cyber" | "soft" | "social" | "strategic";
}) {
  const catColor = category ? `var(--color-cat-${category})` : undefined;
  return (
    <div
      className={cn("panel flex flex-col", className)}
      style={catColor ? { borderTopColor: catColor, borderTopWidth: 2 } : undefined}
    >
      {title && (
        <div className="panel-header">
          {catColor && (
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: catColor }}
            />
          )}
          {icon}
          <span className="flex-1">{title}</span>
          {right}
        </div>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}
