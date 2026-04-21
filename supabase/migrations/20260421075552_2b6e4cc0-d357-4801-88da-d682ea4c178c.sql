-- Tabla de solicitudes entrantes: otros actores que contactan al jugador
CREATE TABLE public.incoming_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  created_at_turn INTEGER NOT NULL,
  lore_date DATE NOT NULL,
  -- Actor que contacta
  actor_name TEXT NOT NULL,
  actor_flag TEXT,
  actor_role TEXT, -- ej. "Primer Ministro", "Comisión Europea"
  -- Tipo y contenido
  request_type TEXT NOT NULL DEFAULT 'reunion', -- reunion | propuesta | consulta | queja
  urgency TEXT NOT NULL DEFAULT 'normal', -- baja | normal | alta | critica
  topic TEXT NOT NULL,
  message TEXT NOT NULL,
  -- Convocados sugeridos para precargar el modal de rol si se acepta
  suggested_attendees JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Estado y trazabilidad
  status TEXT NOT NULL DEFAULT 'pendiente', -- pendiente | aceptada | respondida | ignorada | caducada
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_session_id UUID REFERENCES public.roleplay_sessions(id) ON DELETE SET NULL,
  origin TEXT NOT NULL DEFAULT 'reactiva', -- reactiva | agenda_propia
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incoming_requests_game_status ON public.incoming_requests(game_id, status);

ALTER TABLE public.incoming_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own requests"
ON public.incoming_requests FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.games g WHERE g.id = incoming_requests.game_id AND g.user_id = auth.uid()));

CREATE POLICY "Users insert own requests"
ON public.incoming_requests FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.games g WHERE g.id = incoming_requests.game_id AND g.user_id = auth.uid()));

CREATE POLICY "Users update own requests"
ON public.incoming_requests FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.games g WHERE g.id = incoming_requests.game_id AND g.user_id = auth.uid()));