import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Loader2, Globe2 } from "lucide-react";
import { StatePanels } from "@/components/sim/StatePanels";
import { EventsFeed } from "@/components/sim/EventsFeed";
import { CapabilitiesPanel } from "@/components/sim/CapabilitiesPanel";
import { MeetingsPanel } from "@/components/sim/MeetingsPanel";
import { fmtDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/partida/$gameId")({
  component: PartidaPage,
});

function PartidaPage() {
  const { gameId } = Route.useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<any>(null);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [caps, setCaps] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const load = async () => {
    setLoading(true);
    const [{ data: g }, { data: snaps }, { data: evs }, { data: c }, { data: m }] =
      await Promise.all([
        supabase.from("games").select("*").eq("id", gameId).maybeSingle(),
        supabase
          .from("game_state_snapshots")
          .select("*")
          .eq("game_id", gameId)
          .order("turn_number", { ascending: false })
          .limit(1),
        supabase
          .from("game_events")
          .select("*")
          .eq("game_id", gameId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("capabilities").select("*").eq("game_id", gameId),
        supabase
          .from("scheduled_meetings")
          .select("*")
          .eq("game_id", gameId)
          .order("scheduled_date")
          .limit(10),
      ]);
    setGame(g);
    setSnapshot(snaps?.[0] ?? null);
    setEvents(evs ?? []);
    setCaps(c ?? []);
    setMeetings(m ?? []);
    setLoading(false);
  };

  const handleAction = async () => {
    if (!action.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("game-turn", {
        body: { gameId, action: action.trim() },
      });
      if (error) {
        // Intenta parsear el mensaje de error del edge
        const ctx = (error as any)?.context;
        let msg = error.message;
        if (ctx && typeof ctx.json === "function") {
          try { const j = await ctx.json(); if (j?.error) msg = j.error; } catch {}
        }
        toast.error(msg || "Error procesando el turno");
      } else {
        toast.success(
          data?.lore_date
            ? `Trimestre cerrado. Nueva fecha: ${data.lore_date}`
            : "Turno procesado",
        );
        setAction("");
        await load();
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Error procesando el turno");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!game || !snapshot) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="font-mono text-sm text-muted-foreground">Partida no encontrada</div>
        <Button onClick={() => navigate({ to: "/partidas" })}>Volver</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Top bar */}
      <header className="border-b border-border-strong px-4 py-2 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-20">
        <div className="flex items-center gap-3">
          <Link to="/partidas">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="text-3xl leading-none">{game.flag_emoji}</div>
          <div>
            <div className="font-bold text-sm leading-tight">{game.territory_name}</div>
            <div className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
              {game.territory_code}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 font-mono">
          <div className="text-right">
            <div className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Turno</div>
            <div className="metric text-lg text-primary leading-none">{game.turn_number}</div>
          </div>
          <div className="text-right border-l border-border pl-4">
            <div className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">
              Fecha lore
            </div>
            <div className="metric text-sm leading-none">{fmtDate(game.lore_date)}</div>
          </div>
          <div className="text-right border-l border-border pl-4 hidden sm:block">
            <div className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">
              Estado
            </div>
            <div className="text-[color:var(--success)] text-xs leading-none flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--success)] animate-pulse" />
              ACTIVO
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4 max-w-[1600px] mx-auto">
        {/* Indicadores */}
        <StatePanels s={snapshot} />

        {/* Side columns + feed */}
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 lg:col-span-8">
            <EventsFeed events={events} />
          </div>
          <div className="col-span-12 lg:col-span-4 space-y-3">
            <CapabilitiesPanel caps={caps} />
            <MeetingsPanel meetings={meetings} />
          </div>
        </div>
      </main>

      {/* Action bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border-strong bg-background/95 backdrop-blur p-3 z-20">
        <div className="max-w-[1600px] mx-auto flex gap-2 items-end">
          <div className="flex-1">
            <div className="text-[0.6rem] uppercase tracking-[0.2em] text-primary font-mono mb-1 flex items-center gap-2">
              <Globe2 className="h-3 w-3" />
              // ORDEN DEL JEFE DE ESTADO
            </div>
            <Textarea
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="Escribe lo que haces este trimestre. Sin opciones cerradas. El mundo reaccionará."
              rows={2}
              className="font-mono resize-none"
              disabled={submitting}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAction();
              }}
            />
          </div>
          <Button
            onClick={handleAction}
            disabled={submitting || !action.trim()}
            className="font-mono uppercase tracking-wider h-[60px]"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">
              {submitting ? "Procesando trimestre…" : "Ejecutar"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
