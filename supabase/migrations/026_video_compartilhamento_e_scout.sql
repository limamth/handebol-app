-- Migração 026: Controle de compartilhamento de análises de vídeo com atletas
-- Executar no SQL Editor do Supabase após a 025.

alter table projetos_video
  add column if not exists compartilhado_atletas boolean not null default false;
