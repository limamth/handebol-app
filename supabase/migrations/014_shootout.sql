-- Etapa 17: módulo Shoot-out. Rode no SQL Editor do Supabase DEPOIS do 013. Pode ser repetido sem erro.

create or replace function pode_shootout() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(meu_papel() in ('gestor', 'comissao_tecnica'), false) $$;

-- Atletas que também defendem no shoot-out (qualquer posição), com o estilo do goleiro
create table if not exists shootout_goleiros (
  atleta_id uuid primary key references usuarios on delete cascade,
  estilo text not null check (estilo in ('baliza', 'saida')),
  observacoes text,
  ativo boolean not null default true
);

-- Sessões de shoot-out: independentes do calendário, com ligação opcional e fase de treinamento
create table if not exists shootout_sessoes (
  id uuid primary key default gen_random_uuid(),
  clube_id uuid not null references clubes,
  fase_id uuid references fases_treinamento on delete set null,
  sessao_calendario_id uuid references sessoes on delete set null,
  nome text,
  data date not null,
  observacoes text,
  criado_em timestamptz default now()
);

-- Batidas. "Externo" = atleta ou goleiro de fora da seleção (sem cadastro).
create table if not exists shootout_batidas (
  id uuid primary key default gen_random_uuid(),
  shootout_sessao_id uuid not null references shootout_sessoes on delete cascade,
  batedor_id uuid references usuarios on delete cascade,
  batedor_externo boolean not null default false,
  goleiro_id uuid references usuarios on delete set null,
  goleiro_externo boolean not null default false,
  resultado text not null check (resultado in ('convertido', 'perdido')),
  tipo text check (tipo in ('1pt', 'lancamento_direto', 'infracao', '6_metros')),
  observacao text,
  registrado_por uuid references usuarios on delete set null,
  criado_em timestamptz default now(),
  check ((batedor_id is not null) <> batedor_externo),
  check (not (goleiro_id is not null and goleiro_externo))
);
create index if not exists shootout_batidas_sessao on shootout_batidas (shootout_sessao_id);
create index if not exists shootout_batidas_batedor on shootout_batidas (batedor_id);
create index if not exists shootout_batidas_goleiro on shootout_batidas (goleiro_id);

alter table shootout_goleiros enable row level security;
alter table shootout_sessoes enable row level security;
alter table shootout_batidas enable row level security;

-- Todos do clube (inclusive atletas) veem tudo; só gestor e comissão técnica escrevem
drop policy if exists "ver goleiros de shootout" on shootout_goleiros;
drop policy if exists "comissao edita goleiros de shootout" on shootout_goleiros;
create policy "ver goleiros de shootout" on shootout_goleiros for select
  using (exists (select 1 from usuarios u where u.id = atleta_id and u.clube_id = meu_clube()));
create policy "comissao edita goleiros de shootout" on shootout_goleiros for all
  using (pode_shootout() and exists (select 1 from usuarios u where u.id = atleta_id and u.clube_id = meu_clube()))
  with check (pode_shootout() and exists (select 1 from usuarios u where u.id = atleta_id and u.clube_id = meu_clube()));

drop policy if exists "ver sessoes de shootout" on shootout_sessoes;
drop policy if exists "comissao edita sessoes de shootout" on shootout_sessoes;
create policy "ver sessoes de shootout" on shootout_sessoes for select using (clube_id = meu_clube());
create policy "comissao edita sessoes de shootout" on shootout_sessoes for all
  using (pode_shootout() and clube_id = meu_clube())
  with check (pode_shootout() and clube_id = meu_clube());

drop policy if exists "ver batidas de shootout" on shootout_batidas;
drop policy if exists "comissao edita batidas de shootout" on shootout_batidas;
create policy "ver batidas de shootout" on shootout_batidas for select
  using (exists (select 1 from shootout_sessoes s where s.id = shootout_sessao_id and s.clube_id = meu_clube()));
create policy "comissao edita batidas de shootout" on shootout_batidas for all
  using (pode_shootout() and exists (select 1 from shootout_sessoes s where s.id = shootout_sessao_id and s.clube_id = meu_clube()))
  with check (pode_shootout() and exists (select 1 from shootout_sessoes s where s.id = shootout_sessao_id and s.clube_id = meu_clube()));
