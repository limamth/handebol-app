-- Etapa 18: Scouting de Adversários (Shoot-out e Jogo).
-- Rode no SQL Editor do Supabase DEPOIS do 017. Pode ser repetido sem erro.

create table if not exists equipes_adversarias (
  id uuid primary key default gen_random_uuid(),
  clube_id uuid not null references clubes on delete cascade,
  nome text not null,
  categoria text,
  criado_em timestamptz default now()
);

create table if not exists atletas_adversarios (
  id uuid primary key default gen_random_uuid(),
  equipe_adversaria_id uuid not null references equipes_adversarias on delete cascade,
  clube_id uuid not null references clubes on delete cascade,
  nome text not null,
  numero integer,
  posicao text,
  mao text check (mao in ('destro', 'canhoto')),
  observacoes text,
  criado_em timestamptz default now()
);

create table if not exists scout_finalizacoes_adversario (
  id uuid primary key default gen_random_uuid(),
  clube_id uuid not null references clubes on delete cascade,
  equipe_adversaria_id uuid not null references equipes_adversarias on delete cascade,
  atleta_adversario_id uuid references atletas_adversarios on delete set null,
  origem text not null check (origem in ('shootout', 'jogo')) default 'shootout',
  
  -- Para Shoot-out:
  estilo_goleiro text check (estilo_goleiro in ('baliza', 'saida')),
  quadrante_baliza text check (quadrante_baliza in ('sup_esq', 'sup_cen', 'sup_dir', 'med_esq', 'med_cen', 'med_dir', 'inf_esq', 'inf_cen', 'inf_dir', 'trave', 'fora')),
  tecnica_saida text check (tecnica_saida in ('aerea', 'costela', 'cobertura', 'deita_corpo', 'fuga')),
  
  -- Para Jogo (fase 2):
  zona_campo text,
  tipo_finalizacao text,
  
  resultado text not null check (resultado in ('convertido', 'perdido')),
  desfecho_detalhe text check (desfecho_detalhe in ('gol', 'defesa', 'fora', 'trave')),
  nosso_goleiro_id uuid references usuarios on delete set null,
  observacao text,
  registrado_por uuid references usuarios on delete set null,
  criado_em timestamptz default now()
);

create index if not exists idx_scout_adv_equipe on scout_finalizacoes_adversario (equipe_adversaria_id);
create index if not exists idx_scout_adv_atleta on scout_finalizacoes_adversario (atleta_adversario_id);
create index if not exists idx_scout_adv_origem on scout_finalizacoes_adversario (origem);

alter table equipes_adversarias enable row level security;
alter table atletas_adversarios enable row level security;
alter table scout_finalizacoes_adversario enable row level security;

-- Políticas de RLS
drop policy if exists "ver equipes adversarias" on equipes_adversarias;
drop policy if exists "comissao edita equipes adversarias" on equipes_adversarias;
create policy "ver equipes adversarias" on equipes_adversarias for select
  using (clube_id = meu_clube());
create policy "comissao edita equipes adversarias" on equipes_adversarias for all
  using (pode_shootout() and clube_id = meu_clube())
  with check (pode_shootout() and clube_id = meu_clube());

drop policy if exists "ver atletas adversarios" on atletas_adversarios;
drop policy if exists "comissao edita atletas adversarios" on atletas_adversarios;
create policy "ver atletas adversarios" on atletas_adversarios for select
  using (clube_id = meu_clube());
create policy "comissao edita atletas adversarios" on atletas_adversarios for all
  using (pode_shootout() and clube_id = meu_clube())
  with check (pode_shootout() and clube_id = meu_clube());

drop policy if exists "ver scout finalizacoes adversario" on scout_finalizacoes_adversario;
drop policy if exists "comissao edita scout finalizacoes adversario" on scout_finalizacoes_adversario;
create policy "ver scout finalizacoes adversario" on scout_finalizacoes_adversario for select
  using (clube_id = meu_clube());
create policy "comissao edita scout finalizacoes adversario" on scout_finalizacoes_adversario for all
  using (pode_shootout() and clube_id = meu_clube())
  with check (pode_shootout() and clube_id = meu_clube());
