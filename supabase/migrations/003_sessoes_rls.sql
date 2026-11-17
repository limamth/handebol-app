-- Etapa 2: regras de acesso do calendário. Rode no SQL Editor DEPOIS do 002.

create or replace function pode_planejar() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(meu_papel() in ('gestor','treinador','preparador_fisico'), false) $$;

alter table sessoes enable row level security;
alter table presencas enable row level security;
alter table sessao_exercicios enable row level security;

create policy "ver sessoes do clube" on sessoes for select
  using (exists (select 1 from equipas e where e.id = equipa_id and e.clube_id = meu_clube()));
create policy "comissao edita sessoes" on sessoes for all
  using (pode_planejar() and exists (select 1 from equipas e where e.id = equipa_id and e.clube_id = meu_clube()))
  with check (pode_planejar() and exists (select 1 from equipas e where e.id = equipa_id and e.clube_id = meu_clube()));

create policy "ver presencas do clube" on presencas for select
  using (exists (select 1 from sessoes s join equipas e on e.id = s.equipa_id where s.id = sessao_id and e.clube_id = meu_clube()));
create policy "comissao edita presencas" on presencas for all
  using (pode_planejar() and exists (select 1 from sessoes s join equipas e on e.id = s.equipa_id where s.id = sessao_id and e.clube_id = meu_clube()))
  with check (pode_planejar() and exists (select 1 from sessoes s join equipas e on e.id = s.equipa_id where s.id = sessao_id and e.clube_id = meu_clube()));

create policy "ver exercicios da sessao" on sessao_exercicios for select
  using (exists (select 1 from sessoes s join equipas e on e.id = s.equipa_id where s.id = sessao_id and e.clube_id = meu_clube()));
create policy "comissao edita exercicios da sessao" on sessao_exercicios for all
  using (pode_planejar() and exists (select 1 from sessoes s join equipas e on e.id = s.equipa_id where s.id = sessao_id and e.clube_id = meu_clube()))
  with check (pode_planejar() and exists (select 1 from sessoes s join equipas e on e.id = s.equipa_id where s.id = sessao_id and e.clube_id = meu_clube()));
