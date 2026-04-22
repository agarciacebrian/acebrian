// Propone una duración temporal realista para una orden del jefe de Estado.
// La IA analiza la acción y devuelve una unidad + cantidad + razón breve.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Eres un analista político-estratégico. Estimas cuánto tiempo realista hay que dejar transcurrir tras una orden del jefe de Estado para que el mundo reaccione de forma plausible.

CRITERIOS:
- 1-3 días: declaración pública, nombramiento, llamada telefónica, comunicado, orden ejecutiva inmediata, operación táctica puntual.
- 1-2 semanas: decreto, negociación corta, despliegue militar limitado, cumbre exprés, gestión de crisis aguda.
- 3-6 semanas: paquete legislativo en trámite urgente, operación diplomática estructurada, reforma sectorial menor.
- 1-3 meses (trimestre): plan estructural, programa industrial, reforma de calado, transición sectorial, presupuesto, estrategia.
- 3+ meses: muy raro, solo si la orden explícitamente activa transiciones plurianuales sin acción intermedia.

Cuando dudes entre dos, elige la MÁS CORTA. El jugador siempre puede ajustar.

Devuelves SOLO JSON: {"unit":"days|weeks|months","amount":number,"label":"texto corto","reason":"1 frase justificando"}.`;

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
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: game } = await supabase.from("games").select("territory_name,territory_code,flag_emoji,lore_date").eq("id", gameId).maybeSingle();
    if (!game) throw new Error("Partida no encontrada");

    const userPrompt = `Territorio: ${game.territory_name} (${game.territory_code}) ${game.flag_emoji}
Fecha actual: ${game.lore_date}

ORDEN DEL JEFE DE ESTADO:
"""
${action.trim()}
"""

Estima la duración temporal más plausible para que el mundo reaccione. JSON estricto.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
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
    const content = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) try { parsed = JSON.parse(m[0]); } catch {}
    }

    const unit = ["days", "weeks", "months"].includes(parsed.unit) ? parsed.unit : "months";
    const amountRaw = Number(parsed.amount);
    let amount = Number.isFinite(amountRaw) && amountRaw > 0 ? Math.round(amountRaw) : 3;
    // Sanity caps
    if (unit === "days") amount = Math.min(amount, 14);
    else if (unit === "weeks") amount = Math.min(amount, 8);
    else amount = Math.min(amount, 6);

    return new Response(JSON.stringify({
      unit,
      amount,
      label: typeof parsed.label === "string" ? parsed.label : `${amount} ${unit}`,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("game-propose-duration error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
