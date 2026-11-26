-- Migração 029: Personalização visual por slide (fontes, cores, fundo, alinhamento)
-- Executar no SQL Editor do Supabase após a 028.

alter table apresentacao_slides
  add column if not exists estilo jsonb not null default '{}'::jsonb;
