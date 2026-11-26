-- Migração 021: Análise de Jogo ao Vivo (Beach Handball / Handebol de Praia)
-- Executar no SQL Editor do Supabase após a 020.

create table if not exists partidas_analise (
  id uuid primary key default gen_random_uuid(),
  clube_id uuid not null references clubes(id) on delete cascade,
  equipa_id uuid not null references equipas(id) on delete cascade,
  equipe_adversaria_id uuid references equipes_adversarias(id) on delete set null,
  adversario_nome text not null,
  competicao text,
  fase text,
  data_partida date not null default current_date,
  status text not null default 'ao_vivo', -- 'ao_vivo' | 'finalizada'
  set1_nos integer not null default 0,
  set1_adv integer not null default 0,
  set2_nos integer not null default 0,
  set2_adv integer not null default 0,
  shootout_nos integer not null default 0,
  shootout_adv integer not null default 0,
  criado_por uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now()
);

create table if not exists acoes_partida (
  id uuid primary key default gen_random_uuid(),
  clube_id uuid not null references clubes(id) on delete cascade,
  partida_id uuid not null references partidas_analise(id) on delete cascade,
  set_numero integer not null default 1, -- 1 = 1º Set, 2 = 2º Set, 3 = Shoot-out
  lado text not null, -- 'nos' | 'adversario'
  resultado text not null, -- 'gol' | 'fora' | 'defendido' | 'turnover' | 'acao_defensiva'
  atleta_id uuid references usuarios(id) on delete set null,
  atleta_adversario_id uuid references atletas_adversarios(id) on delete set null,
  atleta_nome text not null,
  tipo text not null, -- giro, aerea, 6m, especialista, 1pt | andada, dois_dribles, troca, invasao, passe, recepcao | roubo, falta_ataque, desvio, block
  pontos integer not null default 0,
  atleta_alvo_id uuid,
  atleta_alvo_nome text,
  zona text, -- lat_esq, meio_esq, meio_dir, lat_dir, 9m, direto, contra_ataque, nao_aplica
  faixa_tempo text not null default '0~2', -- 0~2, 2~4, 4~6, 6~8, 8~10
  placar_nos_momento integer not null default 0,
  placar_adv_momento integer not null default 0,
  criado_em timestamptz not null default now()
);

create index if not exists idx_partidas_analise_clube on partidas_analise(clube_id, data_partida desc);
create index if not exists idx_acoes_partida_partida on acoes_partida(partida_id, criado_em asc);

-- Habilitar RLS
alter table partidas_analise enable row level security;
alter table acoes_partida enable row level security;

-- Políticas para partidas_analise
drop policy if exists "ver partidas analise clube" on partidas_analise;
create policy "ver partidas analise clube" on partidas_analise for select
  using (clube_id = meu_clube());

drop policy if exists "staff edita partidas analise" on partidas_analise;
create policy "staff edita partidas analise" on partidas_analise for all
  using (clube_id = meu_clube() and meu_papel() in ('gestor', 'comissao_tecnica'))
  with check (clube_id = meu_clube() and meu_papel() in ('gestor', 'comissao_tecnica'));

-- Políticas para acoes_partida
drop policy if exists "ver acoes partida clube" on acoes_partida;
create policy "ver acoes partida clube" on acoes_partida for select
  using (clube_id = meu_clube());

drop policy if exists "staff edita acoes partida" on acoes_partida;
create policy "staff edita acoes partida" on acoes_partida for all
  using (clube_id = meu_clube() and meu_papel() in ('gestor', 'comissao_tecnica'))
  with check (clube_id = meu_clube() and meu_papel() in ('gestor', 'comissao_tecnica'));
