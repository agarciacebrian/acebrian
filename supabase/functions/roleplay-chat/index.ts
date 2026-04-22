// Roleplay multi-turno: el jugador habla con los actores convocados.
// NO avanza el trimestre. Solo añade mensajes a la sesión.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_EXCHANGES = 10;

const SYSTEM = `Eres el director de juego de una simulación geopolítica de ALTO NIVEL. Esto NO es un simulador de despachos ni de procedimiento administrativo. El jugador es jefe de Estado y los convocados son jefes de Estado, ministros o líderes equivalentes. A este nivel los acuerdos se cierran con APRETÓN DE MANOS y se ejecutan: el papeleo lo hacen los equipos después y no es asunto del juego.

DOCTRINA OBLIGATORIA DE LOS ACTORES:
- HABLAR EN NOMBRE DE LOS CONVOCADOS, NUNCA POR EL JUGADOR.
- Negocian en sustancia, no en forma. Discuten porcentajes, plazos, reparto, condiciones, líneas rojas.
- PROHIBIDO pedir: MoUs, contratos formales, comités técnicos, cartas de intenciones, "elevarlo a equipos jurídicos", "estudiarlo internamente", "consultarlo con mi gabinete", reuniones preparatorias, hojas de ruta, grupos de trabajo, due diligence, marcos institucionales. Eso es ruido burocrático que no existe en este juego.
- En lugar de pedir documentos: PROPONEN cifras concretas, contraofertas, condiciones, plazos. "Te entro al 30% si pones tú la infraestructura crítica y firmamos hoy." "Acepto si excluyes a X." "No por debajo del 45%."
- Cuando hay acuerdo: lo cierran con frase clara ("Hecho." / "Adelante." / "Cuenta con nosotros al 25%."). Punto. Sin condicionar a procesos posteriores.
- Cuando NO hay acuerdo: lo dicen sin rodeos y dan la razón política o estratégica concreta.
- Cada actor responde con su voz, intereses y memoria propios. Realista, cínico, no complaciente. Tensiones cruzadas si son varios.
- Tono duro, seco, diplomático. Cero ñoñería ni jerga corporativa. Idioma del jugador (español por defecto).
- Cada turno tuyo: 1-3 intervenciones, breves (2-4 frases cada una).

Devuelves SIEMPRE JSON sin texto extra:
{
  "turns": [
    {"actor_name": "...", "actor_flag": "🇫🇷|...", "content": "..."}
  ]
}`;

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

    const { sessionId, message } = await req.json();
    if (!sessionId || !message?.trim()) {
      return new Response(JSON.stringify({ error: "sessionId y message requeridos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: session } = await supabase
      .from("roleplay_sessions").select("*, games(*)").eq("id", sessionId).maybeSingle();
    if (!session) throw new Error("Sesión no encontrada");
    if (session.status !== "abierta") throw new Error("Sesión cerrada");
    if (session.exchange_count >= MAX_EXCHANGES) {
      return new Response(JSON.stringify({ error: "Límite de turnos alcanzado. Cierra la reunión." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: prevMsgs } = await supabase
      .from("roleplay_messages").select("*").eq("session_id", sessionId).order("created_at");

    // Insertar mensaje del jugador
    await supabase.from("roleplay_messages").insert({
      session_id: sessionId, role: "user",
      actor_name: session.games.territory_name, actor_flag: session.games.flag_emoji,
      content: message.trim(),
    });

    const game = session.games;
    const convocadosTxt = (session.convocados ?? []).map((c: any) =>
      `- ${c.name}${c.flag ? ` ${c.flag}` : ""}${c.role ? ` (${c.role})` : ""}`
    ).join("\n") || "(sin convocados explícitos)";

    const historyTxt = (prevMsgs ?? []).map((m: any) => {
      if (m.role === "user") return `[${game.territory_name}] ${m.content}`;
      return `[${m.actor_name ?? "Actor"}${m.actor_flag ? ` ${m.actor_flag}` : ""}] ${m.content}`;
    }).join("\n");

    const userPrompt = `CONTEXTO:
Jefe de Estado: ${game.territory_name} ${game.flag_emoji}
Tema de la reunión: ${session.topic}
Turno del juego: ${game.turn_number} (fecha lore ${game.lore_date})

CONVOCADOS (responde solo por estos):
${convocadosTxt}

HISTORIAL DE LA REUNIÓN:
${historyTxt}
[${game.territory_name}] ${message.trim()}

Responde con las intervenciones de los CONVOCADOS reaccionando al último mensaje del jefe de Estado. JSON estricto, nada más.`;

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
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Espera unos segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA agotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway ${aiRes.status}`);
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content;
    let parsed: any;
    try { parsed = JSON.parse(content); }
    catch {
      const m = content?.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("IA no devolvió JSON válido");
      parsed = JSON.parse(m[0]);
    }

    const turns = Array.isArray(parsed.turns) ? parsed.turns : [];
    for (const t of turns) {
      await supabase.from("roleplay_messages").insert({
        session_id: sessionId, role: "actor",
        actor_name: t.actor_name ?? "Actor", actor_flag: t.actor_flag ?? null,
        content: t.content ?? "",
      });
    }

    const newCount = session.exchange_count + 1;
    await supabase.from("roleplay_sessions").update({ exchange_count: newCount }).eq("id", sessionId);

    return new Response(JSON.stringify({ ok: true, turns, exchange_count: newCount, max: MAX_EXCHANGES }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("roleplay-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
