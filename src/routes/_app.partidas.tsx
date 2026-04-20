import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2, LogOut, Play } from "lucide-react";

export const Route = createFileRoute("/_app/partidas")({
  component: PartidasPage,
});

interface Game {
  id: string;
  territory_name: string;
  territory_code: string;
  flag_emoji: string;
  lore_date: string;
  turn_number: number;
  status: string;
  updated_at: string;
}

function PartidasPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerName, setPlayerName] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    void loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: g }, { data: p }] = await Promise.all([
      supabase
        .from("games")
        .select("*")
        .eq("status", "active")
        .order("updated_at", { ascending: false }),
      supabase.from("profiles").select("player_name").eq("id", user!.id).maybeSingle(),
    ]);
    setGames(g ?? []);
    setPlayerName(p?.player_name ?? "Jefe de Estado");
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Borrar partida? Esta acción es irreversible.")) return;
    const { error } = await supabase.from("games").update({ status: "archived" }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Partida archivada");
      void loadAll();
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold font-mono text-sm">
            G
          </div>
          <div className="font-mono text-xs">
            <div className="font-bold tracking-wider">GEOPOLITICA</div>
            <div className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
              {playerName}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => signOut()} className="font-mono">
          <LogOut className="h-3.5 w-3.5 mr-1.5" />
          Salir
        </Button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-[0.65rem] uppercase tracking-[0.3em] text-primary font-mono">
              // BIBLIOTECA DE PARTIDAS
            </div>
            <h1 className="text-2xl font-bold mt-1">Tus mundos</h1>
          </div>
          <Link to="/nueva-partida">
            <Button className="font-mono uppercase tracking-wider">
              <Plus className="h-4 w-4 mr-1.5" />
              Nueva partida
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="panel p-8 text-center text-muted-foreground font-mono text-sm">
            Cargando…
          </div>
        ) : games.length === 0 ? (
          <div className="panel p-12 text-center">
            <div className="text-4xl mb-3">🌍</div>
            <div className="font-mono text-sm text-muted-foreground mb-4">
              No tienes partidas activas. Crea una para comenzar.
            </div>
            <Link to="/nueva-partida">
              <Button className="font-mono uppercase tracking-wider">
                <Plus className="h-4 w-4 mr-1.5" />
                Crear primera partida
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {games.map((g) => (
              <div key={g.id} className="panel p-4 hover:border-primary transition-colors group">
                <div className="flex items-start gap-3">
                  <div className="text-4xl leading-none">{g.flag_emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg leading-tight">{g.territory_name}</div>
                    <div className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground mt-0.5">
                      Turno {g.turn_number} · {fmtDate(g.lore_date)}
                    </div>
                    <div className="font-mono text-[0.6rem] text-muted-foreground mt-1">
                      Última actividad: {fmtDate(g.updated_at)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 font-mono"
                    onClick={() => navigate({ to: "/partida/$gameId", params: { gameId: g.id } })}
                  >
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                    Continuar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(g.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
