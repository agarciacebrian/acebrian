create table public.roleplay_sessions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  opened_at_turn integer not null,
  convocados jsonb not null default '[]'::jsonb,
  topic text not null,
  status text not null default 'abierta',
  summary text,
  exchange_count integer not null default 0,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.roleplay_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.roleplay_sessions(id) on delete cascade,
  role text not null,
  actor_name text,
  actor_flag text,
  content text not null,
  created_at timestamptz not null default now()
);

create index roleplay_messages_session_idx on public.roleplay_messages(session_id, created_at);
create index roleplay_sessions_game_idx on public.roleplay_sessions(game_id, status);

alter table public.roleplay_sessions enable row level security;
alter table public.roleplay_messages enable row level security;

create policy "Users see own sessions" on public.roleplay_sessions for select to authenticated
  using (exists (select 1 from public.games g where g.id = roleplay_sessions.game_id and g.user_id = auth.uid()));
create policy "Users insert own sessions" on public.roleplay_sessions for insert to authenticated
  with check (exists (select 1 from public.games g where g.id = roleplay_sessions.game_id and g.user_id = auth.uid()));
create policy "Users update own sessions" on public.roleplay_sessions for update to authenticated
  using (exists (select 1 from public.games g where g.id = roleplay_sessions.game_id and g.user_id = auth.uid()));

create policy "Users see own rp messages" on public.roleplay_messages for select to authenticated
  using (exists (select 1 from public.roleplay_sessions s join public.games g on g.id = s.game_id where s.id = roleplay_messages.session_id and g.user_id = auth.uid()));
create policy "Users insert own rp messages" on public.roleplay_messages for insert to authenticated
  with check (exists (select 1 from public.roleplay_sessions s join public.games g on g.id = s.game_id where s.id = roleplay_messages.session_id and g.user_id = auth.uid()));