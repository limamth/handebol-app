-- Etapa 13: convocados por fase de treinamento e RPE registrado pelo próprio atleta.
-- Rode no SQL Editor do Supabase DEPOIS do 011.
-- Depois de rodar, abra cada fase de treinamento e marque os convocados: quem não estiver marcado
-- não consegue registrar RPE nem bem-estar.

create table if not exists fase_convocados (
  fase_id uuid not null references fases_treinamento on delete cascade,
  atleta_id uuid not null references usuarios on delete cascade,
  primary key (fase_id, atleta_id)
);
alter table fase_convocados enable row level security;

-- O atleta vê só as próprias convocações; a comissão vê as do clube
create policy "ver convocados" on fase_convocados for select
  using (atleta_id = meu_usuario()
         or (meu_papel() <> 'atleta' and exists (select 1 from fases_treinamento f where f.id = fase_id and f.clube_id = meu_clube())));
create policy "comissao gerencia convocados" on fase_convocados for all
  using (pode_monitorar() and exists (select 1 from fases_treinamento f where f.id = fase_id and f.clube_id = meu_clube()))
  with check (pode_monitorar()
              and exists (select 1 from fases_treinamento f where f.id = fase_id and f.clube_id = meu_clube())
              and exists (select 1 from usuarios u where u.id = atleta_id and u.clube_id = meu_clube()));

-- Convocado em uma fase que está em andamento hoje?
create or replace function convocado_em_fase_ativa() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (
     select 1 from fases_treinamento f
     join fase_convocados c on c.fase_id = f.id
     where f.clube_id = meu_clube() and c.atleta_id = meu_usuario() and hoje_sp() between f.inicio and f.fim) $$;

-- Bem-estar do atleta: só hoje e só se estiver convocado para a fase em andamento
drop policy if exists "atleta registra o proprio bem-estar" on respostas_questionario;
drop policy if exists "atleta corrige o proprio bem-estar" on respostas_questionario;
create policy "atleta registra o proprio bem-estar" on respostas_questionario for insert
  with check (atleta_id = meu_usuario() and convocado_em_fase_ativa() and dia = hoje_sp());
create policy "atleta corrige o proprio bem-estar" on respostas_questionario for update
  using (atleta_id = meu_usuario() and convocado_em_fase_ativa() and dia = hoje_sp())
  with check (atleta_id = meu_usuario() and convocado_em_fase_ativa() and dia = hoje_sp());

-- RPE do atleta: sessão da equipa dele, que já começou (até o dia seguinte), dentro de uma fase em que foi convocado
create or replace function pode_registrar_rpe_proprio(p_sessao uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (
     select 1
     from sessoes s
     join equipas e on e.id = s.equipa_id
     join membros_equipa m on m.equipa_id = s.equipa_id and m.usuario_id = meu_usuario()
     join fases_treinamento f on f.clube_id = e.clube_id
          and (s.inicio at time zone 'America/Sao_Paulo')::date between f.inicio and f.fim
     join fase_convocados c on c.fase_id = f.id and c.atleta_id = meu_usuario()
     where s.id = p_sessao
       and e.clube_id = meu_clube()
       and s.inicio <= now()
       and (s.inicio at time zone 'America/Sao_Paulo')::date >= hoje_sp() - 1) $$;

create policy "atleta ve a propria carga" on rpe_sessao for select
  using (atleta_id = meu_usuario());
create policy "atleta registra a propria carga" on rpe_sessao for insert
  with check (atleta_id = meu_usuario() and pode_registrar_rpe_proprio(sessao_id));
create policy "atleta corrige a propria carga" on rpe_sessao for update
  using (atleta_id = meu_usuario() and pode_registrar_rpe_proprio(sessao_id))
  with check (atleta_id = meu_usuario() and pode_registrar_rpe_proprio(sessao_id));
