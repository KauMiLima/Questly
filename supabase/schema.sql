-- Questly: tabelas do Supabase
-- Cole este arquivo inteiro no Supabase (SQL Editor → New query) e clique em Run.
-- Pode rodar mais de uma vez sem problema.

-- ---------- Perfil: XP, nível, streak, conquistas e estatísticas ----------
create table if not exists public.perfis (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  jogador jsonb not null,
  atualizado_em timestamptz not null default now()
);

-- ---------- Tarefas únicas ----------
create table if not exists public.tarefas (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  titulo text not null check (char_length(titulo) between 1 and 120),
  dificuldade text not null check (dificuldade in ('facil', 'media', 'dificil')),
  concluida boolean not null default false,
  xp_ganho integer not null default 0,
  contou boolean not null default false,
  criada_em timestamptz not null default now(),
  concluida_em timestamptz
);
create index if not exists tarefas_user_id_idx on public.tarefas (user_id);

-- ---------- Hábitos (tarefas recorrentes) ----------
create table if not exists public.habitos (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  titulo text not null check (char_length(titulo) between 1 and 120),
  dificuldade text not null check (dificuldade in ('facil', 'media', 'dificil')),
  repeticao text not null check (repeticao in ('diaria', 'semanal')),
  dias smallint[] not null default '{}',
  -- { "AAAA-MM-DD": { "xp": 10, "contou": true } }
  historico jsonb not null default '{}',
  criado_em timestamptz not null default now()
);
create index if not exists habitos_user_id_idx on public.habitos (user_id);

-- ---------- Segurança: cada usuário só vê e altera os próprios dados ----------
alter table public.perfis enable row level security;
alter table public.tarefas enable row level security;
alter table public.habitos enable row level security;

drop policy if exists "perfis do próprio usuário" on public.perfis;
create policy "perfis do próprio usuário" on public.perfis
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "tarefas do próprio usuário" on public.tarefas;
create policy "tarefas do próprio usuário" on public.tarefas
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "hábitos do próprio usuário" on public.habitos;
create policy "hábitos do próprio usuário" on public.habitos
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
