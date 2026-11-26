-- Migração 024: Módulo de Análise de Vídeo e Tagging Esportivo
-- Executar no SQL Editor do Supabase após a 023.

create table if not exists projetos_video (
  id uuid primary key default gen_random_uuid(),
  clube_id uuid not null references clubes(id) on delete cascade,
  titulo text not null,
  tipo_fonte text not null default 'local', -- 'local' | 'youtube'
  url_video text,
  nome_arquivo text,
  duracao_segundos numeric,
  partida_analise_id uuid references partidas_analise(id) on delete set null,
  botoes_config jsonb,
  criado_por uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now()
);

create table if not exists tags_video (
  id uuid primary key default gen_random_uuid(),
  clube_id uuid not null references clubes(id) on delete cascade,
  projeto_id uuid not null references projetos_video(id) on delete cascade,
  categoria text not null,
  cor text not null default '#f97316',
  tempo_inicio numeric not null,
  tempo_fim numeric not null,
  atleta_nome text,
  observacao text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_projetos_video_clube on projetos_video(clube_id, criado_em desc);
create index if not exists idx_tags_video_projeto on tags_video(projeto_id, tempo_inicio asc);

-- RLS
alter table projetos_video enable row level security;
alter table tags_video enable row level security;

drop policy if exists "ver projetos video clube" on projetos_video;
create policy "ver projetos video clube" on projetos_video for select
  using (clube_id = meu_clube());

drop policy if exists "staff edita projetos video" on projetos_video;
create policy "staff edita projetos video" on projetos_video for all
  using (clube_id = meu_clube() and meu_papel() in ('gestor', 'comissao_tecnica'))
  with check (clube_id = meu_clube() and meu_papel() in ('gestor', 'comissao_tecnica'));

drop policy if exists "ver tags video clube" on tags_video;
create policy "ver tags video clube" on tags_video for select
  using (clube_id = meu_clube());

drop policy if exists "staff edita tags video" on tags_video;
create policy "staff edita tags video" on tags_video for all
  using (clube_id = meu_clube() and meu_papel() in ('gestor', 'comissao_tecnica'))
  with check (clube_id = meu_clube() and meu_papel() in ('gestor', 'comissao_tecnica'));
