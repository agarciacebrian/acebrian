// Cierra una sesión de rol: resume y registra el evento.
// IMPORTANTE: NO avanza el trimestre. Una reunión, por sí sola, no consume tiempo de gobierno.
// El avance temporal está reservado al motor `game-turn` (botón "Ejecutar").
// Aquí solo: 1) pedir un resumen breve a la IA, 2) registrar evento informativo,
// 3) ajuste muy leve de afinidad/diplomacia (rankings_delta acotado a ±1 en soft_power/autonomia)
//    aplicado SOBRE el snapshot del trimestre actual sin crear uno nuevo ni cambiar la fecha.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Eres el director de una simulación geopolítica. Acaba de cerrarse una REUNIÓN entre el jefe de Estado y actores convocados. La reunión NO avanza el tiempo del juego: solo deja un poso diplomático.

Tu salida es un JSON estricto, en español, sin texto extra:
{
  "narrative": "2-3 frases muy concretas sobre qué deja la reunión: posturas, tensiones, compromisos verbales o ausencia de ellos. Sin floritura.",
  "diplomatic_shift": {
    "soft_power_delta": n,   // entero entre -1 y 1
    "autonomia_delta": n,    // entero entre -1 y 1
    "confort_diplomatico_delta": n  // entero entre -2 y 2
  },
  "follow_up_hooks": [
    "Frase corta describiendo un gancho narrativo que la IA del próximo trimestre debería tener en cuenta."
  ]
}

Reglas:
- NO inventes cambios macro (PIB, paro, etc). Esto NO es un cierre de trimestre.
- Los deltas son pequeños porque hablar no es gobernar.
- Si la reunión fue puramente expositiva sin acuerdos, los deltas pueden ser todos 0.`;

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

    const transcriptTxt = (msgs ?? []).map((m: any) => {
      if (m.role === "user") return `[${game.territory_name}] ${m.content}`;
      return `[${m.actor_name ?? "Actor"}${m.actor_flag ? ` ${m.actor_flag}` : ""}] ${m.content}`;
    }).join("\n") || "(sin contenido)";

    const convocadosTxt = (session.convocados ?? []).map((c: any) =>
      `- ${c.name}${c.flag ? ` ${c.flag}` : ""}${c.role ? ` (${c.role})` : ""}`).join("\n") || "(no especificado)";

    const userPrompt = `CONTEXTO:
Territorio: ${game.territory_name} ${game.flag_emoji}
Turno actual (NO avanza): ${game.turn_number} | Fecha lore: ${game.lore_date}

REUNIÓN
Tema: ${session.topic}
Convocados:
${convocadosTxt}

TRANSCRIPCIÓN:
${transcriptTxt}

Devuelve el JSON estricto descrito en el sistema.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userPrompt }],
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
    let parsed: any = {};
    try { parsed = JSON.parse(content); }
    catch {
      const m = content?.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }

    const narrative: string = parsed.narrative ?? "Reunión cerrada sin compromisos formales.";
    const shift = parsed.diplomatic_shift ?? {};
    const clamp = (n: any, lo: number, hi: number) => {
      const v = typeof n === "number" ? Math.round(n) : 0;
      return Math.max(lo, Math.min(hi, v));
    };
    const sp = clamp(shift.soft_power_delta, -1, 1);
    const au = clamp(shift.autonomia_delta, -1, 1);
    const cd = clamp(shift.confort_diplomatico_delta, -2, 2);

    // Aplicar ajuste leve sobre el snapshot ACTUAL (mismo turno, misma fecha) sin crear uno nuevo.
    if (sp !== 0 || au !== 0 || cd !== 0) {
      const { data: snaps } = await supabase
        .from("game_state_snapshots").select("*").eq("game_id", game.id)
        .order("turn_number", { ascending: false }).limit(1);
      const snap = snaps?.[0];
      if (snap) {
        const rankings = { ...(snap.rankings ?? {}) } as Record<string, number>;
        if (sp !== 0 && typeof rankings.soft_power === "number") {
          rankings.soft_power = Math.max(0, Math.min(100, rankings.soft_power + sp));
        }
        if (au !== 0 && typeof rankings.autonomia === "number") {
          rankings.autonomia = Math.max(0, Math.min(100, rankings.autonomia + au));
        }
        const strategic = { ...(snap.strategic ?? {}) } as Record<string, any>;
        if (cd !== 0 && typeof strategic.confort_diplomatico === "number") {
          strategic.confort_diplomatico = Math.max(0, Math.min(100, strategic.confort_diplomatico + cd));
        }
        await supabase.from("game_state_snapshots")
          .update({ rankings, strategic })
          .eq("id", snap.id);
      }
    }

    // Evento informativo (mismo turno, misma fecha — NO avanza)
    await supabase.from("game_events").insert({
      game_id: game.id, turn_number: game.turn_number, lore_date: game.lore_date,
      category: "diplomatico",
      title: `Reunión — ${session.topic}`,
      body: `${narrative}\n\nConvocados: ${(session.convocados ?? []).map((c: any) => c.name).join(", ") || "—"}. Intercambios: ${session.exchange_count}.`,
      severity: "info",
      actors: session.convocados ?? [],
    });

    // Guardar resumen + ganchos en la sesión para que el próximo `game-turn` los recoja
    const hooks = Array.isArray(parsed.follow_up_hooks) ? parsed.follow_up_hooks.slice(0, 4) : [];
    const fullSummary = hooks.length > 0
      ? `${narrative}\n\nGanchos: ${hooks.map((h: string) => `• ${h}`).join(" ")}`
      : narrative;

    await supabase.from("roleplay_sessions").update({
      status: "cerrada", summary: fullSummary, closed_at: new Date().toISOString(),
    }).eq("id", sessionId);

    // Si la reunión vino de una solicitud entrante, marcarla como resuelta
    await supabase.from("incoming_requests")
      .update({
        status: "aceptada",
        resolved_at: new Date().toISOString(),
        resolved_session_id: sessionId,
        resolution_note: narrative,
      })
      .eq("game_id", game.id)
      .eq("resolved_session_id", sessionId);

    return new Response(JSON.stringify({
      ok: true,
      advanced_quarter: false,
      turn: game.turn_number,
      lore_date: game.lore_date,
      narrative,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("roleplay-close error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
