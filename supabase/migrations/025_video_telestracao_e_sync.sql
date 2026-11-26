-- Migração 025: Telestração tática sobre o vídeo e sincronização com Análise ao Vivo
-- Executar no SQL Editor do Supabase após a 024.

alter table tags_video
  add column if not exists desenho_tempo numeric,
  add column if not exists desenho_dados jsonb;
