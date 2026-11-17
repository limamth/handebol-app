-- Etapa 4: carga (RPE), bem-estar e testes físicos. Rode DEPOIS do 004.

-- Uma resposta de bem-estar por atleta por dia
alter table respostas_questionario add column if not exists dia date not null default current_date;
alter table respostas_questionario add constraint resposta_unica_por_dia unique (questionario_id, atleta_id, dia);

create or replace function pode_monitorar() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(meu_papel() in ('gestor','treinador','preparador_fisico'), false) $$;

create or replace function pode_avaliar() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(meu_papel() in ('gestor','preparador_fisico'), false) $$;

alter table rpe_sessao enable row level security;
alter table definicoes_teste enable row level security;
alter table resultados_teste enable row level security;
alter table questionarios enable row level security;
alter table respostas_questionario enable row level security;

-- Dados de carga, bem-estar e testes são sensíveis: atletas não leem os dos colegas.
create policy "ver carga do clube" on rpe_sessao for select
  using (meu_papel() <> 'atleta' and exists (select 1 from sessoes s join equipas e on e.id = s.equipa_id where s.id = sessao_id and e.clube_id = meu_clube()));
create policy "comissao registra carga" on rpe_sessao for all
  using (pode_monitorar() and exists (select 1 from sessoes s join equipas e on e.id = s.equipa_id where s.id = sessao_id and e.clube_id = meu_clube()))
  with check (pode_monitorar() and exists (select 1 from sessoes s join equipas e on e.id = s.equipa_id where s.id = sessao_id and e.clube_id = meu_clube()));

create policy "ver definicoes de teste" on definicoes_teste for select using (clube_id is null or clube_id = meu_clube());
create policy "comissao edita definicoes de teste" on definicoes_teste for all
  using (clube_id = meu_clube() and pode_avaliar()) with check (clube_id = meu_clube() and pode_avaliar());

create policy "ver resultados de teste" on resultados_teste for select
  using (meu_papel() <> 'atleta' and exists (select 1 from usuarios u where u.id = atleta_id and u.clube_id = meu_clube()));
create policy "comissao registra resultados" on resultados_teste for all
  using (pode_avaliar() and exists (select 1 from usuarios u where u.id = atleta_id and u.clube_id = meu_clube()))
  with check (pode_avaliar() and exists (select 1 from usuarios u where u.id = atleta_id and u.clube_id = meu_clube()));

create policy "ver questionarios" on questionarios for select using (clube_id is null or clube_id = meu_clube());
create policy "comissao edita questionarios" on questionarios for all
  using (clube_id = meu_clube() and pode_monitorar()) with check (clube_id = meu_clube() and pode_monitorar());

create policy "ver respostas de bem-estar" on respostas_questionario for select
  using (meu_papel() <> 'atleta' and exists (select 1 from usuarios u where u.id = atleta_id and u.clube_id = meu_clube()));
create policy "comissao registra respostas" on respostas_questionario for all
  using (pode_monitorar() and exists (select 1 from usuarios u where u.id = atleta_id and u.clube_id = meu_clube()))
  with check (pode_monitorar() and exists (select 1 from usuarios u where u.id = atleta_id and u.clube_id = meu_clube()));
