
-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  player_name text not null default 'Jefe de Estado',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles readable by authenticated"
on public.profiles for select to authenticated using (true);

create policy "Users can insert own profile"
on public.profiles for insert to authenticated with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update to authenticated using (auth.uid() = id);

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, player_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'player_name', 'Jefe de Estado'));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- GAMES
create table public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  territory_name text not null,
  territory_code text not null, -- ej. 'ES', 'CAT', 'MAR'
  flag_emoji text not null default '🏳️',
  lore_date date not null default current_date,
  turn_number integer not null default 0,
  status text not null default 'active', -- active | archived
  difficulty text not null default 'realista',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.games enable row level security;

create policy "Users see own games"
on public.games for select to authenticated using (auth.uid() = user_id);

create policy "Users insert own games"
on public.games for insert to authenticated with check (auth.uid() = user_id);

create policy "Users update own games"
on public.games for update to authenticated using (auth.uid() = user_id);

create policy "Users delete own games"
on public.games for delete to authenticated using (auth.uid() = user_id);

create trigger games_updated_at
before update on public.games
for each row execute function public.set_updated_at();

create index games_user_idx on public.games(user_id, status);

-- GAME STATE SNAPSHOTS
create table public.game_state_snapshots (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  turn_number integer not null,
  lore_date date not null,
  -- Bloques de indicadores como JSONB para máxima flexibilidad
  macro jsonb not null default '{}'::jsonb, -- pib, deuda, deficit, paro, inflacion
  energy jsonb not null default '{}'::jsonb, -- mix, renovables_pct, dependencia_ext, resiliencia
  defense jsonb not null default '{}'::jsonb, -- ejercito, marina, aire, gasto_pct_pib
  cyber jsonb not null default '{}'::jsonb, -- defensa, ofensiva, inteligencia
  soft_power jsonb not null default '{}'::jsonb, -- prestigio_int, prestigio_ext, marca, idiomas
  social jsonb not null default '{}'::jsonb, -- idh, demografia, estabilidad_interna
  strategic jsonb not null default '{}'::jsonb, -- autonomia, sobreextension, confort_diplomatico
  rankings jsonb not null default '{}'::jsonb, -- {economia: 12, ejercito: 17, ciber: 8, ...}
  rankings_delta jsonb not null default '{}'::jsonb, -- {economia: -1, ejercito: 0, ...}
  created_at timestamptz not null default now()
);

alter table public.game_state_snapshots enable row level security;

create policy "Users see own snapshots"
on public.game_state_snapshots for select to authenticated
using (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));

create policy "Users insert own snapshots"
on public.game_state_snapshots for insert to authenticated
with check (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));

create index snapshots_game_turn_idx on public.game_state_snapshots(game_id, turn_number desc);

-- GAME EVENTS (historial acumulativo)
create table public.game_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  turn_number integer not null,
  lore_date date not null,
  category text not null, -- 'world' | 'frente' | 'hito' | 'crisis' | 'oportunidad' | 'accion_jugador' | 'evaluacion' | 'reunion'
  title text not null,
  body text not null,
  actors jsonb not null default '[]'::jsonb, -- [{name, flag}]
  severity text not null default 'normal', -- info | normal | grave | critico
  created_at timestamptz not null default now()
);

alter table public.game_events enable row level security;

create policy "Users see own events"
on public.game_events for select to authenticated
using (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));

create policy "Users insert own events"
on public.game_events for insert to authenticated
with check (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));

create index events_game_turn_idx on public.game_events(game_id, turn_number desc);

-- CAPABILITIES (capacidades desplegadas vivas)
create table public.capabilities (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  name text not null,
  category text not null, -- militar | energia | industria | ciber | logistica | financiera | diplomatica
  status text not null default 'activa', -- proyecto | desarrollo | activa | sabotaje | crisis | obsoleta
  deployed_at_turn integer not null,
  description text,
  effects jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.capabilities enable row level security;

create policy "Users see own capabilities"
on public.capabilities for select to authenticated
using (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));

create policy "Users insert own capabilities"
on public.capabilities for insert to authenticated
with check (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));

create policy "Users update own capabilities"
on public.capabilities for update to authenticated
using (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));

create trigger capabilities_updated_at
before update on public.capabilities
for each row execute function public.set_updated_at();

create index capabilities_game_idx on public.capabilities(game_id, status);

-- SCHEDULED MEETINGS (reuniones forzadas)
create table public.scheduled_meetings (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  organization text not null, -- UE, OTAN, SEGIB, G20, AGNU, AIIB, FMI, etc.
  meeting_type text not null,
  scheduled_date date not null,
  status text not null default 'pendiente', -- pendiente | en_curso | resuelta | omitida
  agenda text,
  outcome text,
  created_at timestamptz not null default now()
);

alter table public.scheduled_meetings enable row level security;

create policy "Users see own meetings"
on public.scheduled_meetings for select to authenticated
using (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));

create policy "Users insert own meetings"
on public.scheduled_meetings for insert to authenticated
with check (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));

create policy "Users update own meetings"
on public.scheduled_meetings for update to authenticated
using (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));

create index meetings_game_date_idx on public.scheduled_meetings(game_id, scheduled_date);

-- COUNTRY SEEDS (datos curados públicos)
create table public.country_seeds (
  code text primary key, -- ISO o custom
  name text not null,
  flag_emoji text not null,
  region text not null,
  type text not null default 'pais', -- pais | ccaa | territorio
  initial_state jsonb not null, -- macro, energy, defense, cyber, soft_power, social, strategic
  initial_rankings jsonb not null,
  initial_capabilities jsonb not null default '[]'::jsonb,
  organizations jsonb not null default '[]'::jsonb, -- [{org, since}]
  description text,
  created_at timestamptz not null default now()
);

alter table public.country_seeds enable row level security;

create policy "Country seeds public read"
on public.country_seeds for select to authenticated using (true);
