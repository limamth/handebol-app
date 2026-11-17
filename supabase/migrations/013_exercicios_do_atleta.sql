-- Etapa 16: o atleta só enxerga os exercícios que foram anexados a alguma sessão do calendário.
-- Rode no SQL Editor do Supabase DEPOIS do 012. Pode ser repetido sem erro.

drop policy if exists "ver exercicios" on exercicios;
create policy "ver exercicios" on exercicios for select
  using (
    (clube_id is null or clube_id = meu_clube())
    and (meu_papel() <> 'atleta'
         or exists (select 1 from sessao_exercicios se where se.exercicio_id = exercicios.id))
  );
