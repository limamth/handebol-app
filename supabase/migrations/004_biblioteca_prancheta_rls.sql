-- Etapa 3: regras de acesso da biblioteca de exercícios e da prancheta. Rode DEPOIS do 003.

create or replace function pode_montar_taticas() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(meu_papel() in ('gestor','treinador','analista'), false) $$;

create or replace function pode_gerir_exercicios() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(meu_papel() in ('gestor','treinador','preparador_fisico'), false) $$;

alter table diagramas enable row level security;
alter table exercicios enable row level security;

create policy "ver diagramas do clube" on diagramas for select using (clube_id = meu_clube());
create policy "comissao edita diagramas" on diagramas for all
  using (clube_id = meu_clube() and pode_montar_taticas())
  with check (clube_id = meu_clube() and pode_montar_taticas());

create policy "ver exercicios" on exercicios for select using (clube_id is null or clube_id = meu_clube());
create policy "comissao edita exercicios" on exercicios for all
  using (clube_id = meu_clube() and pode_gerir_exercicios())
  with check (clube_id = meu_clube() and pode_gerir_exercicios());
