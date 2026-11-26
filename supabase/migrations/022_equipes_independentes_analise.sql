-- Migração 022: Equipes independentes para Análise de Jogo ao Vivo
-- Permite criar equipes e elencos exclusivos para análise de jogos (inclusive 2 equipes terceiras),
-- sem vincular às equipes principais do clube.

create table if not exists equipes_analise (
  id uuid primary key default gen_random_uuid(),
  clube_id uuid not null references clubes(id) on delete cascade,
  nome text not null,
  categoria text,
  tipo text not null default 'nossa', -- 'nossa' | 'terceira'
  criado_em timestamptz not null default now()
);

create table if not exists atletas_equipe_analise (
  id uuid primary key default gen_random_uuid(),
  clube_id uuid not null references clubes(id) on delete cascade,
  equipe_analise_id uuid not null references equipes_analise(id) on delete cascade,
  nome text not null,
  numero integer,
  posicao text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_equipes_analise_clube on equipes_analise(clube_id, nome);
create index if not exists idx_atletas_equipe_analise_eq on atletas_equipe_analise(equipe_analise_id, numero);

-- Tornar equipa_id opcional em partidas_analise e adicionar referências independentes (Equipe A x Equipe B)
alter table partidas_analise alter column equipa_id drop not null;
alter table partidas_analise add column if not exists equipe_a_id uuid references equipes_analise(id) on delete set null;
alter table partidas_analise add column if not exists equipe_a_nome text;
alter table partidas_analise add column if not exists equipe_b_id uuid references equipes_analise(id) on delete set null;
alter table partidas_analise add column if not exists equipe_b_nome text;

-- RLS
alter table equipes_analise enable row level security;
alter table atletas_equipe_analise enable row level security;

drop policy if exists "ver equipes analise clube" on equipes_analise;
create policy "ver equipes analise clube" on equipes_analise for select
  using (clube_id = meu_clube());

drop policy if exists "staff edita equipes analise" on equipes_analise;
create policy "staff edita equipes analise" on equipes_analise for all
  using (clube_id = meu_clube() and meu_papel() in ('gestor', 'comissao_tecnica'))
  with check (clube_id = meu_clube() and meu_papel() in ('gestor', 'comissao_tecnica'));

drop policy if exists "ver atletas equipe analise clube" on atletas_equipe_analise;
create policy "ver atletas equipe analise clube" on atletas_equipe_analise for select
  using (clube_id = meu_clube());

drop policy if exists "staff edita atletas equipe analise" on atletas_equipe_analise;
create policy "staff edita atletas equipe analise" on atletas_equipe_analise for all
  using (clube_id = meu_clube() and meu_papel() in ('gestor', 'comissao_tecnica'))
  with check (clube_id = meu_clube() and meu_papel() in ('gestor', 'comissao_tecnica'));
