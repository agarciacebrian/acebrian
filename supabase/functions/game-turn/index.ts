// Motor de Simulación Geopolítica Dura - Tick Trimestral
// Procesa la acción del jugador, hace tick macro obligatorio, y devuelve eventos + snapshot.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres el MOTOR DE SIMULACIÓN GEOPOLÍTICA DURA del juego. No eres asesor ni narrador blando: eres el mundo reaccionando al jugador.

REGLAS DURAS:
- Realista, cínico, no complaciente. Si el jugador hace una tontería, el mundo se lo cobra.
- No eres irrazonable: Francia no cierra frontera porque sí, la UE no activa art.7 sin motivo grave. Reacciones proporcionales, coherentes, con intereses explícitos de cada actor.
- Mercados, élites, ejércitos, sociedades, bloques actúan con lógica propia y memoria de turnos previos.
- Los indicadores macro NO se manipulan a voluntad del jugador. Son resultado de políticas. Si el jugador "decreta" que sube el PIB, no pasa nada. Si baja impuestos, hay déficit.
- El tiempo avanza UN TRIMESTRE (3 meses) cada tick salvo que la acción implique algo más corto (reuniones, operaciones puntuales).
- Eventos del mundo: 2-5 por turno, no todos relacionados con la acción del jugador. El mundo vive su vida.
- Idioma: español por defecto. Si el jugador escribe en otra lengua por rol, puedes espejar.
- Tono: duro, seco, periodístico/diplomático. Cero ñoñería.

DEVUELVES SIEMPRE JSON con esta forma EXACTA, sin texto extra:
{
  "narrative": "Párrafo corto (2-4 frases) describiendo qué pasa en este trimestre como resultado combinado de la acción del jugador + dinámica mundial.",
  "events": [
    {
      "category": "accion_jugador|mundo|mercados|diplomatico|militar|social|energia|ciber|evaluacion",
      "title": "Titular corto estilo agencia",
      "body": "2-4 frases. Concreto. Con actores nombrados.",
      "severity": "info|normal|alerta|critico",
      "actors": [{"name":"...","flag":"🇫🇷"}]
    }
  ],
  "state_patch": {
    "macro": {"pib_usd_bn": number, "deuda_pct_pib": number, "deficit_pct_pib": number, "paro_pct": number, "inflacion_pct": number},
    "energy": {"renovables_pct": number, "dependencia_ext_pct": number, "resiliencia": number, "mix": "string"},
    "defense": {"gasto_pct_pib": number, "ejercito_score": number, "marina_score": number, "aire_score": number, "personal": number},
    "cyber": {"defensa": number, "ofensiva": number, "inteligencia": number},
    "soft_power": {"prestigio_int": number, "prestigio_ext": number, "marca_pais": number, "idiomas_score": number},
    "social": {"idh": number, "demografia_score": number, "estabilidad_interna": number},
    "strategic": {"autonomia": number, "sobreextension": number, "confort_diplomatico": number}
  },
  "rankings_delta": {
    "economia": number, "ejercito": number, "marina": number, "ciber": number,
    "soft_power": number, "renovables": number, "idh": number, "autonomia": number
  },
  "new_capabilities": [
    {"name":"...","category":"militar|energia|ciber|diplomatica|industrial|social","description":"...","effects":{}}
  ]
}

rankings_delta son deltas sobre 100 (positivo sube, negativo baja, rango típico -5..+5). Los scores 0-100 deben evolucionar con coherencia (no saltos brutales salvo crisis). PIB en miles de millones USD, deuda/déficit/paro/inflación en %. new_capabilities solo si la acción del jugador efectivamente despliega algo persistente.`;

function buildUserPrompt(ctx: any) {
  return `CONTEXTO DE PARTIDA:
Territorio del jugador: ${ctx.game.territory_name} (${ctx.game.territory_code}) ${ctx.game.flag_emoji}
Turno actual: ${ctx.game.turn_number} → avanzará a ${ctx.game.turn_number + 1}
Fecha lore actual: ${ctx.game.lore_date} → tras tick: ${ctx.next_lore_date}

ESTADO ACTUAL (último snapshot):
${JSON.stringify(ctx.last_snapshot, null, 2)}

CAPACIDADES DESPLEGADAS:
${ctx.capabilities.map((c: any) => `- ${c.name} (${c.category}): ${c.description ?? ""}`).join("\n") || "(ninguna)"}

ÚLTIMOS EVENTOS (más reciente primero):
${ctx.recent_events.slice(0, 10).map((e: any) => `[T${e.turn_number}] ${e.title}: ${e.body}`).join("\n") || "(arranque)"}

REUNIONES PRÓXIMAS:
${ctx.upcoming_meetings.map((m: any) => `- ${m.scheduled_date} ${m.organization} (${m.meeting_type})`).join("\n") || "(ninguna inminente)"}

ACCIÓN DEL JUGADOR ESTE TURNO:
"""
${ctx.action}
"""

Procesa el trimestre. Devuelve JSON según el esquema. NADA DE TEXTO FUERA DEL JSON.`;
}

// Avanza fecha lore un trimestre (3 meses)
function addQuarter(dateStr: string): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + 3);
  return d.toISOString().slice(0, 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { gameId, action } = await req.json();
    if (!gameId || !action?.trim()) {
      return new Response(JSON.stringify({ error: "gameId y action requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cargar contexto
    const [{ data: game }, { data: snaps }, { data: caps }, { data: evs }, { data: meets }] =
      await Promise.all([
        supabase.from("games").select("*").eq("id", gameId).maybeSingle(),
        supabase.from("game_state_snapshots").select("*").eq("game_id", gameId).order("turn_number", { ascending: false }).limit(1),
        supabase.from("capabilities").select("*").eq("game_id", gameId).eq("status", "activa"),
        supabase.from("game_events").select("*").eq("game_id", gameId).order("created_at", { ascending: false }).limit(15),
        supabase.from("scheduled_meetings").select("*").eq("game_id", gameId).eq("status", "pendiente").order("scheduled_date").limit(5),
      ]);

    if (!game) throw new Error("Partida no encontrada o sin acceso");
    const lastSnapshot = snaps?.[0];
    if (!lastSnapshot) throw new Error("Falta snapshot inicial");

    const nextLoreDate = addQuarter(game.lore_date);
    const nextTurn = game.turn_number + 1;

    const userPrompt = buildUserPrompt({
      game,
      next_lore_date: nextLoreDate,
      last_snapshot: {
        macro: lastSnapshot.macro,
        energy: lastSnapshot.energy,
        defense: lastSnapshot.defense,
        cyber: lastSnapshot.cyber,
        soft_power: lastSnapshot.soft_power,
        social: lastSnapshot.social,
        strategic: lastSnapshot.strategic,
        rankings: lastSnapshot.rankings,
      },
      capabilities: caps ?? [],
      recent_events: evs ?? [],
      upcoming_meetings: meets ?? [],
      action: action.trim(),
    });

    // Llamar Lovable AI Gateway - Gemini 2.5 Pro con response_format json_object
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI gateway error", aiRes.status, txt);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Espera unos segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA agotados. Añade saldo en Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway ${aiRes.status}`);
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Respuesta IA vacía");

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      // limpieza defensiva
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("IA no devolvió JSON válido");
      parsed = JSON.parse(m[0]);
    }

    const patch = parsed.state_patch ?? {};
    const rd = parsed.rankings_delta ?? {};
    const prevRank = (lastSnapshot.rankings ?? {}) as Record<string, number>;
    const newRankings: Record<string, number> = {};
    for (const k of Object.keys(prevRank)) {
      const d = typeof rd[k] === "number" ? rd[k] : 0;
      newRankings[k] = Math.max(0, Math.min(100, (prevRank[k] ?? 50) + d));
    }

    // Insertar snapshot nuevo
    const { error: snapErr } = await supabase.from("game_state_snapshots").insert({
      game_id: gameId,
      turn_number: nextTurn,
      lore_date: nextLoreDate,
      macro: patch.macro ?? lastSnapshot.macro,
      energy: patch.energy ?? lastSnapshot.energy,
      defense: patch.defense ?? lastSnapshot.defense,
      cyber: patch.cyber ?? lastSnapshot.cyber,
      soft_power: patch.soft_power ?? lastSnapshot.soft_power,
      social: patch.social ?? lastSnapshot.social,
      strategic: patch.strategic ?? lastSnapshot.strategic,
      rankings: newRankings,
      rankings_delta: rd,
    });
    if (snapErr) throw snapErr;

    // Evento de acción del jugador
    await supabase.from("game_events").insert({
      game_id: gameId,
      turn_number: nextTurn,
      lore_date: nextLoreDate,
      category: "accion_jugador",
      title: `Orden del jefe de Estado — T${nextTurn}`,
      body: action.trim(),
      severity: "info",
      actors: [{ name: game.territory_name, flag: game.flag_emoji }],
    });

    // Narrativa resumen
    if (parsed.narrative) {
      await supabase.from("game_events").insert({
        game_id: gameId,
        turn_number: nextTurn,
        lore_date: nextLoreDate,
        category: "evaluacion",
        title: `Trimestre cerrado — ${nextLoreDate}`,
        body: parsed.narrative,
        severity: "info",
      });
    }

    // Eventos del mundo
    const worldEvents = Array.isArray(parsed.events) ? parsed.events : [];
    for (const ev of worldEvents) {
      await supabase.from("game_events").insert({
        game_id: gameId,
        turn_number: nextTurn,
        lore_date: nextLoreDate,
        category: ev.category ?? "mundo",
        title: ev.title ?? "Evento",
        body: ev.body ?? "",
        severity: ev.severity ?? "normal",
        actors: ev.actors ?? [],
      });
    }

    // Nuevas capacidades
    const newCaps = Array.isArray(parsed.new_capabilities) ? parsed.new_capabilities : [];
    for (const c of newCaps) {
      await supabase.from("capabilities").insert({
        game_id: gameId,
        name: c.name,
        category: c.category ?? "industrial",
        description: c.description ?? null,
        effects: c.effects ?? {},
        deployed_at_turn: nextTurn,
        status: "activa",
      });
    }

    // Avanzar game
    await supabase.from("games").update({
      turn_number: nextTurn,
      lore_date: nextLoreDate,
      updated_at: new Date().toISOString(),
    }).eq("id", gameId);

    return new Response(JSON.stringify({ ok: true, turn: nextTurn, lore_date: nextLoreDate, narrative: parsed.narrative }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("game-turn error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
