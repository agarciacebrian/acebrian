import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/partidas" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold font-mono">
            G
          </div>
          <div className="font-mono text-sm">
            <div className="font-bold tracking-wider">GEOPOLITICA</div>
            <div className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
              Motor de simulación
            </div>
          </div>
        </div>
        <Link to="/auth">
          <Button variant="outline" size="sm" className="font-mono">
            Acceder
          </Button>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-3xl w-full">
          <div className="text-[0.7rem] uppercase tracking-[0.3em] text-primary mb-4 font-mono">
            // SISTEMA OPERATIVO · v1.0
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight">
            El mundo no espera<br />
            <span className="text-primary">a que tú decidas.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            Motor de simulación geopolítica dura. Eliges país, CCAA o territorio y
            asumes el mando. Cada turno avanza el lore, los mercados se mueven, los
            bloques se reposicionan, las élites te miden. Sin opciones cerradas. Sin
            tono Disney. Con consecuencias materiales.
          </p>

          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
            {[
              { k: "Indicadores vivos", v: "32+" },
              { k: "Rankings mundiales", v: "8" },
              { k: "Organizaciones", v: "20+" },
              { k: "Memoria acumulativa", v: "∞" },
            ].map((s) => (
              <div key={s.k} className="panel p-3">
                <div className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                  {s.k}
                </div>
                <div className="metric text-2xl text-primary mt-1">{s.v}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex gap-3">
            <Link to="/auth">
              <Button size="lg" className="font-mono uppercase tracking-wider">
                Iniciar partida
              </Button>
            </Link>
          </div>

          <div className="mt-12 text-[0.65rem] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            // El motor recuerda lo que firmas. No inventa tratados que no firmaste.
          </div>
        </div>
      </main>
    </div>
  );
}
