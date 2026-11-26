-- Migração 027: Playlists personalizadas de cortes de vídeo
-- Executar no SQL Editor do Supabase após a 026.

create table if not exists playlists_video (
  id uuid primary key default gen_random_uuid(),
  clube_id uuid not null references clubes(id) on delete cascade,
  projeto_id uuid not null references projetos_video(id) on delete cascade,
  nome text not null,
  tag_ids jsonb not null default '[]'::jsonb,
  criado_por uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_playlists_video_projeto on playlists_video(projeto_id, criado_em desc);

alter table playlists_video enable row level security;

drop policy if exists "ver playlists video clube" on playlists_video;
create policy "ver playlists video clube" on playlists_video for select
  using (clube_id = meu_clube());

drop policy if exists "staff edita playlists video" on playlists_video;
create policy "staff edita playlists video" on playlists_video for all
  using (clube_id = meu_clube() and meu_papel() in ('gestor', 'comissao_tecnica'))
  with check (clube_id = meu_clube() and meu_papel() in ('gestor', 'comissao_tecnica'));
