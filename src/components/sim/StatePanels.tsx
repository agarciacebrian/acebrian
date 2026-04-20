import { Panel } from "@/components/sim/Panel";
import { Metric } from "@/components/sim/Metric";
import { Bar } from "@/components/sim/Bar";
import { fmtBn, fmtPct, fmtNum } from "@/lib/format";

interface Snapshot {
  macro: any;
  energy: any;
  defense: any;
  cyber: any;
  soft_power: any;
  social: any;
  strategic: any;
  rankings: Record<string, number>;
  rankings_delta: Record<string, number>;
}

export function StatePanels({ s }: { s: Snapshot }) {
  const r = s.rankings ?? {};
  const d = s.rankings_delta ?? {};

  return (
    <div className="grid grid-cols-12 gap-3">
      {/* MACRO */}
      <Panel title="Macro · Economía" category="macro" className="col-span-12 md:col-span-6 xl:col-span-4">
        <div className="grid grid-cols-2">
          <Metric
            label="PIB"
            value={fmtBn(s.macro.pib_usd_bn)}
            rank={r.economia}
            rankDelta={d.economia}
          />
          <Metric
            label="Deuda / PIB"
            value={fmtPct(s.macro.deuda_pct_pib)}
            tone={s.macro.deuda_pct_pib > 100 ? "warn" : "default"}
          />
          <Metric
            label="Déficit"
            value={fmtPct(s.macro.deficit_pct_pib)}
            tone={s.macro.deficit_pct_pib > 4 ? "bad" : "default"}
          />
          <Metric
            label="Paro"
            value={fmtPct(s.macro.paro_pct)}
            tone={s.macro.paro_pct > 12 ? "bad" : s.macro.paro_pct < 5 ? "good" : "default"}
          />
          <Metric
            label="Inflación"
            value={fmtPct(s.macro.inflacion_pct)}
            tone={s.macro.inflacion_pct > 5 ? "bad" : "default"}
          />
          <Metric label="Estabilidad" value={fmtNum(s.social.estabilidad_interna)} unit="/100" />
        </div>
      </Panel>

      {/* ENERGIA */}
      <Panel title="Energía" category="energy" className="col-span-12 md:col-span-6 xl:col-span-4">
        <div className="grid grid-cols-2">
          <Metric
            label="Renovables"
            value={fmtPct(s.energy.renovables_pct, 0)}
            rank={r.renovables}
            rankDelta={d.renovables}
          />
          <Metric
            label="Dep. exterior"
            value={fmtPct(s.energy.dependencia_ext_pct, 0)}
            tone={s.energy.dependencia_ext_pct > 70 ? "bad" : "default"}
          />
          <Metric label="Resiliencia" value={fmtNum(s.energy.resiliencia)} unit="/100" />
          <Metric label="Mix" value={s.energy.mix ?? "—"} />
        </div>
        <div className="px-3 pb-3 pt-1">
          <div className="text-[0.6rem] uppercase tracking-wider text-muted-foreground mb-1 font-mono">
            Resiliencia energética
          </div>
          <Bar value={s.energy.resiliencia ?? 0} category="energy" showValue />
        </div>
      </Panel>

      {/* DEFENSA */}
      <Panel title="Defensa" category="defense" className="col-span-12 md:col-span-6 xl:col-span-4">
        <div className="grid grid-cols-2">
          <Metric
            label="Ejército"
            value={fmtNum(s.defense.ejercito_score)}
            unit="/100"
            rank={r.ejercito}
            rankDelta={d.ejercito}
          />
          <Metric
            label="Marina"
            value={fmtNum(s.defense.marina_score)}
            unit="/100"
            rank={r.marina}
            rankDelta={d.marina}
          />
          <Metric label="Aire" value={fmtNum(s.defense.aire_score)} unit="/100" />
          <Metric label="% PIB defensa" value={fmtPct(s.defense.gasto_pct_pib)} />
          <Metric label="Personal" value={fmtNum(s.defense.personal)} hint="efectivos" />
        </div>
      </Panel>

      {/* CIBER */}
      <Panel title="Ciber · Inteligencia" category="cyber" className="col-span-12 md:col-span-6 xl:col-span-4">
        <div className="grid grid-cols-3">
          <Metric
            label="Defensa"
            value={fmtNum(s.cyber.defensa)}
            unit="/100"
            rank={r.ciber}
            rankDelta={d.ciber}
          />
          <Metric label="Ofensiva" value={fmtNum(s.cyber.ofensiva)} unit="/100" />
          <Metric label="Inteligencia" value={fmtNum(s.cyber.inteligencia)} unit="/100" />
        </div>
        <div className="px-3 pb-3 pt-1 space-y-1.5">
          <Bar value={s.cyber.defensa ?? 0} category="cyber" />
          <Bar value={s.cyber.ofensiva ?? 0} category="cyber" />
          <Bar value={s.cyber.inteligencia ?? 0} category="cyber" />
        </div>
      </Panel>

      {/* SOFT POWER */}
      <Panel title="Soft Power" category="soft" className="col-span-12 md:col-span-6 xl:col-span-4">
        <div className="grid grid-cols-2">
          <Metric
            label="Marca país"
            value={fmtNum(s.soft_power.marca_pais)}
            unit="/100"
            rank={r.soft_power}
            rankDelta={d.soft_power}
          />
          <Metric label="Prestigio ext." value={fmtNum(s.soft_power.prestigio_ext)} unit="/100" />
          <Metric label="Prestigio int." value={fmtNum(s.soft_power.prestigio_int)} unit="/100" />
          <Metric label="Idiomas" value={fmtNum(s.soft_power.idiomas_score)} unit="/100" />
        </div>
      </Panel>

      {/* SOCIAL */}
      <Panel title="Social · Demografía" category="social" className="col-span-12 md:col-span-6 xl:col-span-4">
        <div className="grid grid-cols-2">
          <Metric
            label="IDH"
            value={fmtNum(s.social.idh, 3)}
            rank={r.idh}
            rankDelta={d.idh}
          />
          <Metric label="Demografía" value={fmtNum(s.social.demografia_score)} unit="/100" />
          <Metric label="Estabilidad" value={fmtNum(s.social.estabilidad_interna)} unit="/100" />
        </div>
      </Panel>

      {/* ESTRATEGICO */}
      <Panel title="Estratégico" category="strategic" className="col-span-12">
        <div className="grid grid-cols-3">
          <Metric
            label="Autonomía estratégica"
            value={fmtNum(s.strategic.autonomia)}
            unit="/100"
            rank={r.autonomia}
            rankDelta={d.autonomia}
          />
          <Metric
            label="Sobreextensión"
            value={fmtNum(s.strategic.sobreextension)}
            unit="/100"
            tone={s.strategic.sobreextension > 70 ? "bad" : "default"}
          />
          <Metric
            label="Confort diplomático"
            value={fmtNum(s.strategic.confort_diplomatico)}
            unit="/100"
          />
        </div>
      </Panel>
    </div>
  );
}
