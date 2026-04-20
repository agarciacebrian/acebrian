export function fmtPct(n: number | undefined | null, decimals = 1): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return `${n.toFixed(decimals)}%`;
}

export function fmtNum(n: number | undefined | null, decimals = 0): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function fmtBn(n: number | undefined | null): string {
  if (n === undefined || n === null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(2)} T$`;
  return `${fmtNum(n)} B$`;
}

export function fmtRank(n: number | undefined | null): string {
  if (!n) return "—";
  return `${n}.º`;
}

export function fmtDelta(n: number | undefined | null): { text: string; tone: "up" | "down" | "flat" } {
  if (!n || n === 0) return { text: "—", tone: "flat" };
  // Para rankings: bajar de número = mejorar
  if (n < 0) return { text: `▲ ${Math.abs(n)}`, tone: "up" };
  return { text: `▼ ${n}`, tone: "down" };
}

export function fmtDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
