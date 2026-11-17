-- Etapa 11: o atleta vê só a própria presença (faltas por doença ou lesão são dado sensível).
-- Rode no SQL Editor do Supabase DEPOIS do 009.

drop policy if exists "ver presencas do clube" on presencas;
create policy "ver presencas do clube" on presencas for select
  using (
    exists (select 1 from sessoes s join equipas e on e.id = s.equipa_id where s.id = sessao_id and e.clube_id = meu_clube())
    and (meu_papel() <> 'atleta' or atleta_id = meu_usuario())
  );
