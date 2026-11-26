-- Migração 028: Módulo de Apresentações Táticas (substituto de PowerPoint/Slides com integração de Vídeo)
-- Executar no SQL Editor do Supabase após a 027.

create table if not exists apresentacoes (
  id uuid primary key default gen_random_uuid(),
  clube_id uuid not null references clubes(id) on delete cascade,
  titulo text not null,
  descricao text,
  tema text not null default 'escuro', -- 'escuro' | 'quadra' | 'claro'
  compartilhado_atletas boolean not null default false,
  criado_por uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists apresentacao_slides (
  id uuid primary key default gen_random_uuid(),
  clube_id uuid not null references clubes(id) on delete cascade,
  apresentacao_id uuid not null references apresentacoes(id) on delete cascade,
  ordem integer not null default 0,
  tipo text not null default 'texto', -- 'capa' | 'texto' | 'video_corte' | 'imagem'
  titulo text,
  subtitulo text,
  conteudo text,
  imagem_url text,
  projeto_video_id uuid references projetos_video(id) on delete set null,
  tag_video_id uuid references tags_video(id) on delete set null,
  video_tempo_inicio numeric,
  video_tempo_fim numeric,
  criado_em timestamptz not null default now()
);

create index if not exists idx_apresentacoes_clube on apresentacoes(clube_id, atualizado_em desc);
create index if not exists idx_apresentacao_slides_ordem on apresentacao_slides(apresentacao_id, ordem asc);

-- RLS
alter table apresentacoes enable row level security;
alter table apresentacao_slides enable row level security;

drop policy if exists "ver apresentacoes clube" on apresentacoes;
create policy "ver apresentacoes clube" on apresentacoes for select
  using (clube_id = meu_clube());

drop policy if exists "staff edita apresentacoes" on apresentacoes;
create policy "staff edita apresentacoes" on apresentacoes for all
  using (clube_id = meu_clube() and meu_papel() in ('gestor', 'comissao_tecnica'))
  with check (clube_id = meu_clube() and meu_papel() in ('gestor', 'comissao_tecnica'));

drop policy if exists "ver slides clube" on apresentacao_slides;
create policy "ver slides clube" on apresentacao_slides for select
  using (clube_id = meu_clube());

drop policy if exists "staff edita slides" on apresentacao_slides;
create policy "staff edita slides" on apresentacao_slides for all
  using (clube_id = meu_clube() and meu_papel() in ('gestor', 'comissao_tecnica'))
  with check (clube_id = meu_clube() and meu_papel() in ('gestor', 'comissao_tecnica'));
