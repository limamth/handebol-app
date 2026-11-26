-- Migração 023: Região do gol na Análise ao Vivo + Interligação com Scout (equipes, atletas e arremessos)
-- Executar no SQL Editor do Supabase após a 022.

alter table equipes_analise
  add column if not exists equipe_adversaria_id uuid references equipes_adversarias(id) on delete set null;

alter table atletas_equipe_analise
  add column if not exists atleta_adversario_id uuid references atletas_adversarios(id) on delete set null;

alter table acoes_partida
  add column if not exists quadrante_baliza text;

alter table acoes_partida
  add column if not exists scout_finalizacao_id uuid references scout_finalizacoes_adversario(id) on delete set null;
