import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/nueva-partida")({
  component: NuevaPartidaPage,
});

interface Seed {
  code: string;
  name: string;
  flag_emoji: string;
  region: string;
  description: string | null;
  initial_state: any;
  initial_rankings: any;
  organizations: any;
}

function NuevaPartidaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [selected, setSelected] = useState<Seed | null>(null);
  const [customName, setCustomName] = useState("");
  const [customFlag, setCustomFlag] = useState("🏳️");
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    void supabase
      .from("country_seeds")
      .select("*")
      .order("name")
      .then(({ data }) => setSeeds(data ?? []));
  }, []);

  const filtered = seeds.filter((s) =>
    s.name.toLowerCase().includes(filter.toLowerCase()) ||
    s.region.toLowerCase().includes(filter.toLowerCase())
  );

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const isCustom = !selected;
      const territoryName = isCustom ? customName.trim() : selected!.name;
      const territoryCode = isCustom
        ? customName.trim().toUpperCase().slice(0, 8).replace(/\s/g, "_")
        : selected!.code;
      const flag = isCustom ? customFlag : selected!.flag_emoji;

      if (!territoryName) {
        toast.error("Indica un nombre de territorio");
        setCreating(false);
        return;
      }

      // Crear game
      const { data: game, error: gameErr } = await supabase
        .from("games")
        .insert({
          user_id: user.id,
          territory_name: territoryName,
          territory_code: territoryCode,
          flag_emoji: flag,
          lore_date: new Date().toISOString().slice(0, 10),
          turn_number: 0,
        })
        .select()
        .single();
      if (gameErr || !game) throw gameErr ?? new Error("No se creó la partida");

      // Snapshot inicial
      const baseState = selected?.initial_state ?? {
        macro: { pib_usd_bn: 100, deuda_pct_pib: 60, deficit_pct_pib: 3, paro_pct: 8, inflacion_pct: 3 },
        energy: { renovables_pct: 30, dependencia_ext_pct: 60, resiliencia: 50, mix: "mixto" },
        defense: { gasto_pct_pib: 1.5, ejercito_score: 50, marina_score: 40, aire_score: 45, personal: 50000 },
        cyber: { defensa: 50, ofensiva: 40, inteligencia: 50 },
        soft_power: { prestigio_int: 50, prestigio_ext: 50, marca_pais: 50, idiomas_score: 50 },
        social: { idh: 0.75, demografia_score: 55, estabilidad_interna: 60 },
        strategic: { autonomia: 40, sobreextension: 30, confort_diplomatico: 55 },
      };
      const baseRankings = selected?.initial_rankings ?? {
        economia: 80, ejercito: 80, marina: 80, ciber: 80,
        soft_power: 80, renovables: 80, idh: 80, autonomia: 80,
      };

      const { error: snapErr } = await supabase.from("game_state_snapshots").insert({
        game_id: game.id,
        turn_number: 0,
        lore_date: game.lore_date,
        macro: baseState.macro,
        energy: baseState.energy,
        defense: baseState.defense,
        cyber: baseState.cyber,
        soft_power: baseState.soft_power,
        social: baseState.social,
        strategic: baseState.strategic,
        rankings: baseRankings,
        rankings_delta: {},
      });
      if (snapErr) throw snapErr;

      // Evento inicial
      await supabase.from("game_events").insert({
        game_id: game.id,
        turn_number: 0,
        lore_date: game.lore_date,
        category: "evaluacion",
        title: `Inicio de mando en ${territoryName}`,
        body: selected?.description ?? `Comienzas tu partida al frente de ${territoryName}. El mundo gira. Que empiece.`,
        actors: [{ name: territoryName, flag }],
        severity: "info",
      });

      toast.success("Partida creada");
      navigate({ to: "/partida/$gameId", params: { gameId: game.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Error al crear partida");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-6 py-3 flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur z-10">
        <Link to="/partidas">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="font-mono text-sm font-bold tracking-wider">NUEVA PARTIDA</div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="text-[0.65rem] uppercase tracking-[0.3em] text-primary font-mono mb-2">
              // 1. ELIGE TERRITORIO
            </div>
            <Input
              placeholder="Buscar país o región…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="font-mono mb-3"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[480px] overflow-y-auto pr-1">
              {filtered.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => {
                    setSelected(s);
                    setCustomName("");
                  }}
                  className={`panel p-3 text-left hover:border-primary transition-colors ${
                    selected?.code === s.code ? "border-primary ring-1 ring-primary" : ""
                  }`}
                >
                  <div className="text-2xl">{s.flag_emoji}</div>
                  <div className="font-mono font-bold text-sm mt-1">{s.name}</div>
                  <div className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                    {s.region}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6">
              <div className="text-[0.65rem] uppercase tracking-[0.3em] text-primary font-mono mb-2">
                // O CREA TERRITORIO PERSONALIZADO
              </div>
              <div className="panel p-4 grid grid-cols-[80px_1fr] gap-3">
                <div>
                  <Label className="text-[0.65rem] uppercase tracking-wider font-mono">Bandera</Label>
                  <Input
                    value={customFlag}
                    onChange={(e) => setCustomFlag(e.target.value)}
                    className="font-mono text-2xl text-center mt-1"
                    maxLength={4}
                  />
                </div>
                <div>
                  <Label className="text-[0.65rem] uppercase tracking-wider font-mono">
                    Nombre (CCAA, territorio, etc.)
                  </Label>
                  <Input
                    value={customName}
                    onChange={(e) => {
                      setCustomName(e.target.value);
                      if (e.target.value) setSelected(null);
                    }}
                    placeholder="Ej. Cataluña, Kurdistán, Texas…"
                    className="font-mono mt-1"
                  />
                  <div className="text-[0.6rem] text-muted-foreground font-mono mt-1">
                    Arrancarás con indicadores genéricos. El motor IA los irá ajustando.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-[0.65rem] uppercase tracking-[0.3em] text-primary font-mono mb-2">
              // 2. CONFIRMAR
            </div>
            <div className="panel p-4 sticky top-20">
              {selected ? (
                <>
                  <div className="text-5xl">{selected.flag_emoji}</div>
                  <div className="font-bold text-xl mt-2">{selected.name}</div>
                  <div className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                    {selected.region}
                  </div>
                  {selected.description && (
                    <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                      {selected.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(selected.organizations as any[])?.slice(0, 6).map((o, i) => (
                      <span
                        key={i}
                        className="text-[0.6rem] font-mono px-1.5 py-0.5 bg-muted rounded"
                      >
                        {o.org}
                      </span>
                    ))}
                  </div>
                </>
              ) : customName ? (
                <>
                  <div className="text-5xl">{customFlag}</div>
                  <div className="font-bold text-xl mt-2">{customName}</div>
                  <div className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                    Territorio personalizado
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground font-mono">
                  Selecciona un territorio o introduce uno propio.
                </div>
              )}

              <Button
                onClick={handleCreate}
                disabled={creating || (!selected && !customName.trim())}
                className="w-full mt-6 font-mono uppercase tracking-wider"
              >
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {creating ? "Creando…" : "Iniciar partida"}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
