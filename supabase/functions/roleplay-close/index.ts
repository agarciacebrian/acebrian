// Cierra una sesión de rol: resume, aplica como acción del jugador y avanza el trimestre.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_TURN = `Eres el MOTOR DE SIMULACIÓN GEOPOLÍTICA DURA. Acaba de cerrarse una reunión que ha tenido el jefe de Estado con actores concretos. Procesa el trimestre considerando la reunión como acción principal, pero también deja que el mundo viva su vida (2-5 eventos del mundo, no todos relacionados).

Reglas:
- Realista, cínico, no complaciente. Reacciones proporcionales y coherentes.
- Indicadores macro evolucionan según lo discutido y el contexto, sin saltos absurdos.
- Tiempo avanza UN TRIMESTRE.
- Idioma: español.

Devuelves JSON EXACTO sin texto extra:
{
  "narrative": "Resumen 2-4 frases de qué deja la reunión y el trimestre.",
  "events": [{"category":"...","title":"...","body":"...","severity":"info|normal|alerta|critico","actors":[{"name":"...","flag":"..."}]}],
  "state_patch": {
    "macro": {"pib_usd_bn":n,"deuda_pct_pib":n,"deficit_pct_pib":n,"paro_pct":n,"inflacion_pct":n},
    "energy": {"renovables_pct":n,"dependencia_ext_pct":n,"resiliencia":n,"mix":"s"},
    "defense": {"gasto_pct_pib":n,"ejercito_score":n,"marina_score":n,"aire_score":n,"personal":n},
    "cyber": {"defensa":n,"ofensiva":n,"inteligencia":n},
    "soft_power": {"prestigio_int":n,"prestigio_ext":n,"marca_pais":n,"idiomas_score":n},
    "social": {"idh":n,"demografia_score":n,"estabilidad_interna":n},
    "strategic": {"autonomia":n,"sobreextension":n,"confort_diplomatico":n}
  },
  "rankings_delta": {"economia":n,"ejercito":n,"marina":n,"ciber":n,"soft_power":n,"renovables":n,"idh":n,"autonomia":n},
  "new_capabilities": []
}
rankings_delta: deltas -5..+5. Scores 0-100.`;

function addQuarter(d: string): string {
  const x = new Date(d); x.setMonth(x.getMonth() + 3);
  return x.toISOString().slice(0, 10);
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

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("sessionId requerido");

    const { data: session } = await supabase
      .from("roleplay_sessions").select("*, games(*)").eq("id", sessionId).maybeSingle();
    if (!session) throw new Error("Sesión no encontrada");
    if (session.status !== "abierta") throw new Error("Sesión ya cerrada");

    const game = session.games;
    const { data: msgs } = await supabase
      .from("roleplay_messages").select("*").eq("session_id", sessionId).order("created_at");
    const { data: snaps } = await supabase
      .from("game_state_snapshots").select("*").eq("game_id", game.id)
      .order("turn_number", { ascending: false }).limit(1);
    const lastSnapshot = snaps?.[0];
    if (!lastSnapshot) throw new Error("Falta snapshot");

    const { data: caps } = await supabase
      .from("capabilities").select("*").eq("game_id", game.id).eq("status", "activa");
    const { data: recentEvs } = await supabase
      .from("game_events").select("*").eq("game_id", game.id)
      .order("created_at", { ascending: false }).limit(10);

    const transcriptTxt = (msgs ?? []).map((m: any) => {
      if (m.role === "user") return `[${game.territory_name}] ${m.content}`;
      return `[${m.actor_name ?? "Actor"}${m.actor_flag ? ` ${m.actor_flag}` : ""}] ${m.content}`;
    }).join("\n") || "(sin contenido)";

    const convocadosTxt = (session.convocados ?? []).map((c: any) =>
      `- ${c.name}${c.flag ? ` ${c.flag}` : ""}${c.role ? ` (${c.role})` : ""}`).join("\n") || "(no especificado)";

    const nextLoreDate = addQuarter(game.lore_date);
    const nextTurn = game.turn_number + 1;

    const userPrompt = `CONTEXTO DE PARTIDA:
Territorio: ${game.territory_name} (${game.territory_code}) ${game.flag_emoji}
Turno: ${game.turn_number} → ${nextTurn} | Fecha: ${game.lore_date} → ${nextLoreDate}

ESTADO ACTUAL:
${JSON.stringify({
  macro: lastSnapshot.macro, energy: lastSnapshot.energy, defense: lastSnapshot.defense,
  cyber: lastSnapshot.cyber, soft_power: lastSnapshot.soft_power, social: lastSnapshot.social,
  strategic: lastSnapshot.strategic, rankings: lastSnapshot.rankings,
}, null, 2)}

CAPACIDADES:
${(caps ?? []).map((c: any) => `- ${c.name} (${c.category})`).join("\n") || "(ninguna)"}

ÚLTIMOS EVENTOS:
${(recentEvs ?? []).map((e: any) => `[T${e.turn_number}] ${e.title}`).join("\n") || "(arranque)"}

REUNIÓN QUE ACABA DE CERRARSE
Tema: ${session.topic}
Convocados:
${convocadosTxt}

TRANSCRIPCIÓN:
${transcriptTxt}

Procesa el trimestre. Devuelve JSON estricto.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "system", content: SYSTEM_TURN }, { role: "user", content: userPrompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI gateway error", aiRes.status, txt);
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA agotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway ${aiRes.status}`);
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content;
    let parsed: any;
    try { parsed = JSON.parse(content); }
    catch {
      const m = content?.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("IA no devolvió JSON");
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

    await supabase.from("game_state_snapshots").insert({
      game_id: game.id, turn_number: nextTurn, lore_date: nextLoreDate,
      macro: patch.macro ?? lastSnapshot.macro,
      energy: patch.energy ?? lastSnapshot.energy,
      defense: patch.defense ?? lastSnapshot.defense,
      cyber: patch.cyber ?? lastSnapshot.cyber,
      soft_power: patch.soft_power ?? lastSnapshot.soft_power,
      social: patch.social ?? lastSnapshot.social,
      strategic: patch.strategic ?? lastSnapshot.strategic,
      rankings: newRankings, rankings_delta: rd,
    });

    // Evento: resumen de la reunión
    await supabase.from("game_events").insert({
      game_id: game.id, turn_number: nextTurn, lore_date: nextLoreDate,
      category: "diplomatico",
      title: `Reunión cerrada — ${session.topic}`,
      body: `Convocados: ${(session.convocados ?? []).map((c: any) => c.name).join(", ") || "—"}. Intercambios: ${session.exchange_count}.`,
      severity: "info",
      actors: session.convocados ?? [],
    });

    if (parsed.narrative) {
      await supabase.from("game_events").insert({
        game_id: game.id, turn_number: nextTurn, lore_date: nextLoreDate,
        category: "evaluacion",
        title: `Trimestre cerrado — ${nextLoreDate}`,
        body: parsed.narrative, severity: "info",
      });
    }

    const worldEvents = Array.isArray(parsed.events) ? parsed.events : [];
    for (const ev of worldEvents) {
      await supabase.from("game_events").insert({
        game_id: game.id, turn_number: nextTurn, lore_date: nextLoreDate,
        category: ev.category ?? "mundo",
        title: ev.title ?? "Evento", body: ev.body ?? "",
        severity: ev.severity ?? "normal", actors: ev.actors ?? [],
      });
    }

    const newCaps = Array.isArray(parsed.new_capabilities) ? parsed.new_capabilities : [];
    for (const c of newCaps) {
      await supabase.from("capabilities").insert({
        game_id: game.id, name: c.name, category: c.category ?? "industrial",
        description: c.description ?? null, effects: c.effects ?? {},
        deployed_at_turn: nextTurn, status: "activa",
      });
    }

    await supabase.from("games").update({
      turn_number: nextTurn, lore_date: nextLoreDate, updated_at: new Date().toISOString(),
    }).eq("id", game.id);

    await supabase.from("roleplay_sessions").update({
      status: "cerrada", summary: parsed.narrative ?? null, closed_at: new Date().toISOString(),
    }).eq("id", sessionId);

    return new Response(JSON.stringify({ ok: true, turn: nextTurn, lore_date: nextLoreDate, narrative: parsed.narrative }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("roleplay-close error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
