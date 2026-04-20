import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Send, X, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Convocado { name: string; flag?: string; role?: string }
interface Msg { id: string; role: string; actor_name: string | null; actor_flag: string | null; content: string }

interface Props {
  open: boolean;
  onClose: (didCloseQuarter: boolean) => void;
  gameId: string;
  game: { territory_name: string; flag_emoji: string; turn_number: number };
}

const MAX = 10;

export function RoleplayModal({ open, onClose, gameId, game }: Props) {
  const [phase, setPhase] = useState<"setup" | "chat" | "closing">("setup");
  const [topic, setTopic] = useState("");
  const [convocadosRaw, setConvocadosRaw] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [convocados, setConvocados] = useState<Convocado[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setPhase("setup"); setTopic(""); setConvocadosRaw("");
      setSessionId(null); setConvocados([]); setMessages([]);
      setInput(""); setSending(false); setExchangeCount(0);
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const parseConvocados = (raw: string): Convocado[] => {
    return raw.split(/\n|,/).map(s => s.trim()).filter(Boolean).map(line => {
      // Formato libre: "Macron 🇫🇷 (presidente)" o solo "Macron"
      const flagMatch = line.match(/(\p{Extended_Pictographic}+)/u);
      const roleMatch = line.match(/\(([^)]+)\)/);
      let name = line;
      if (flagMatch) name = name.replace(flagMatch[0], "").trim();
      if (roleMatch) name = name.replace(roleMatch[0], "").trim();
      return { name, flag: flagMatch?.[0], role: roleMatch?.[1] };
    });
  };

  const startSession = async () => {
    if (!topic.trim() || !convocadosRaw.trim()) {
      toast.error("Indica tema y al menos un convocado");
      return;
    }
    const conv = parseConvocados(convocadosRaw);
    if (!conv.length) { toast.error("No se entendió ningún convocado"); return; }

    const { data, error } = await supabase.from("roleplay_sessions").insert({
      game_id: gameId,
      opened_at_turn: game.turn_number,
      convocados: conv as unknown as never,
      topic: topic.trim(),
      status: "abierta",
    }).select("*").single();
    if (error) { toast.error(error.message); return; }

    setSessionId(data.id); setConvocados(conv); setPhase("chat");
  };

  const sendMessage = async () => {
    if (!input.trim() || !sessionId || sending) return;
    if (exchangeCount >= MAX) { toast.error("Límite alcanzado. Cierra la reunión."); return; }
    setSending(true);

    // Optimista
    const userText = input.trim();
    setInput("");
    const tempId = `tmp-${Date.now()}`;
    setMessages(m => [...m, { id: tempId, role: "user", actor_name: game.territory_name, actor_flag: game.flag_emoji, content: userText }]);

    try {
      const { data, error } = await supabase.functions.invoke("roleplay-chat", {
        body: { sessionId, message: userText },
      });
      if (error) {
        const ctx = (error as any)?.context;
        let msg = error.message;
        if (ctx && typeof ctx.json === "function") { try { const j = await ctx.json(); if (j?.error) msg = j.error; } catch {} }
        toast.error(msg ?? "Error en la reunión");
        setMessages(m => m.filter(x => x.id !== tempId));
        setInput(userText);
      } else {
        // Recargar mensajes desde DB
        const { data: msgs } = await supabase.from("roleplay_messages")
          .select("*").eq("session_id", sessionId).order("created_at");
        setMessages(msgs ?? []);
        setExchangeCount(data?.exchange_count ?? exchangeCount + 1);
      }
    } finally {
      setSending(false);
    }
  };

  const closeMeeting = async () => {
    if (!sessionId) return;
    setPhase("closing");
    try {
      const { data, error } = await supabase.functions.invoke("roleplay-close", { body: { sessionId } });
      if (error) {
        const ctx = (error as any)?.context;
        let msg = error.message;
        if (ctx && typeof ctx.json === "function") { try { const j = await ctx.json(); if (j?.error) msg = j.error; } catch {} }
        toast.error(msg ?? "Error cerrando reunión");
        setPhase("chat");
      } else {
        toast.success(`Trimestre cerrado. Nueva fecha: ${data?.lore_date}`);
        onClose(true);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Error cerrando reunión");
      setPhase("chat");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && phase !== "closing") onClose(false); }}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="border-b border-border-strong p-3 space-y-1">
          <DialogTitle className="font-mono text-sm uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {phase === "setup" ? "Convocar reunión" : `Reunión: ${topic || "—"}`}
          </DialogTitle>
          {phase !== "setup" && (
            <div className="text-[0.6rem] font-mono text-muted-foreground">
              Convocados: {convocados.map(c => `${c.name}${c.flag ? ` ${c.flag}` : ""}`).join(", ")}
              {" · "}Intercambios: {exchangeCount}/{MAX}
            </div>
          )}
        </DialogHeader>

        {phase === "setup" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="text-[0.65rem] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">
                Tema de la reunión
              </label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)}
                placeholder="Ej: Conferencia con presidentes autonómicos sobre financiación"
                className="font-mono text-sm" />
            </div>
            <div>
              <label className="text-[0.65rem] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">
                Convocados (uno por línea o separados por coma)
              </label>
              <Textarea value={convocadosRaw} onChange={(e) => setConvocadosRaw(e.target.value)}
                placeholder={"Ej:\nIsabel Díaz Ayuso 🇪🇸 (Madrid)\nPere Aragonès 🇪🇸 (Catalunya)\nIñigo Urkullu 🇪🇸 (Euskadi)"}
                rows={6} className="font-mono text-sm resize-none" />
              <div className="text-[0.6rem] text-muted-foreground font-mono mt-1">
                Solo estos actores responderán. Formato libre: nombre, bandera opcional, rol opcional entre paréntesis.
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button variant="ghost" onClick={() => onClose(false)}>Cancelar</Button>
              <Button onClick={startSession} disabled={!topic.trim() || !convocadosRaw.trim()}>
                Abrir reunión
              </Button>
            </DialogFooter>
          </div>
        )}

        {phase !== "setup" && (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 && (
                <div className="text-center text-xs text-muted-foreground font-mono py-6">
                  Abre la reunión con tu primera intervención.
                </div>
              )}
              {messages.map(m => (
                <div key={m.id} className={cn(
                  "rounded-md p-2.5 border text-sm",
                  m.role === "user"
                    ? "border-primary/40 bg-primary/5 ml-6"
                    : "border-border bg-card mr-6"
                )}>
                  <div className="text-[0.6rem] font-mono uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                    {m.actor_flag && <span className="text-sm leading-none">{m.actor_flag}</span>}
                    <span className="truncate">{m.actor_name ?? (m.role === "user" ? game.territory_name : "Actor")}</span>
                  </div>
                  <div className="font-mono text-[0.78rem] leading-relaxed whitespace-pre-wrap">{m.content}</div>
                </div>
              ))}
              {sending && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono p-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Los actores deliberan…
                </div>
              )}
              {phase === "closing" && (
                <div className="flex items-center gap-2 text-xs text-primary font-mono p-2 border border-primary/30 rounded">
                  <Loader2 className="h-3 w-3 animate-spin" /> Cerrando trimestre y aplicando consecuencias…
                </div>
              )}
            </div>

            <div className="border-t border-border-strong p-3 space-y-2">
              <Textarea value={input} onChange={(e) => setInput(e.target.value)}
                placeholder={exchangeCount >= MAX ? "Límite alcanzado. Cierra la reunión." : "Tu intervención…"}
                rows={2} className="font-mono text-sm resize-none"
                disabled={sending || phase === "closing" || exchangeCount >= MAX}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendMessage(); }} />
              <div className="flex justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={() => onClose(false)}
                  disabled={phase === "closing"} className="text-muted-foreground">
                  <X className="h-4 w-4 mr-1" /> Salir sin cerrar
                </Button>
                <div className="flex gap-2">
                  <Button onClick={sendMessage} size="sm"
                    disabled={sending || phase === "closing" || !input.trim() || exchangeCount >= MAX}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span className="ml-1 hidden sm:inline">Enviar</span>
                  </Button>
                  <Button onClick={closeMeeting} size="sm" variant="default"
                    disabled={phase === "closing" || sending || messages.length === 0}
                    className="bg-[color:var(--warning)] text-background hover:bg-[color:var(--warning)]/90">
                    Cerrar reunión (avanza trimestre)
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
