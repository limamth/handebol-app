-- Etapa 12: novas perguntas do bem-estar (sono, cansaço, dores, humor e disposição; sem estresse).
-- Rode no SQL Editor do Supabase DEPOIS do 010. Pode ser repetido sem erro.

-- 1) Novas perguntas do questionário
update questionarios set perguntas =
  '[{"chave":"sono","pergunta":"Qualidade do sono","dica":"1 = muito ruim · 5 = excelente","min":1,"max":5},
    {"chave":"cansaco","pergunta":"Cansaço","dica":"1 = exausto · 5 = descansado","min":1,"max":5},
    {"chave":"dores","pergunta":"Dores","dica":"1 = muita dor · 5 = sem dor","min":1,"max":5},
    {"chave":"humor","pergunta":"Humor e disposição","dica":"1 = muito baixo · 5 = excelente","min":1,"max":5}]'::jsonb
where nome = 'Bem-estar diário';

-- 2) Respostas já registradas: energia vira cansaço, músculos viram dores e o estresse sai.
--    A direção das notas é a mesma de antes (5 = melhor), então nada precisa ser invertido.
update respostas_questionario
set respostas = jsonb_strip_nulls(
      (respostas - 'estresse' - 'energia' - 'musculos')
      || jsonb_build_object('cansaco', respostas -> 'energia', 'dores', respostas -> 'musculos'))
where respostas ?| array['estresse', 'energia', 'musculos'];

-- 3) Clubes novos recebem o questionário já com as perguntas novas
create or replace function garantir_questionario() returns uuid
language plpgsql security definer set search_path = public as $$
declare v_clube uuid; v_id uuid;
begin
  v_clube := meu_clube();
  if v_clube is null then raise exception 'Sem acesso.'; end if;
  select id into v_id from questionarios where clube_id = v_clube and nome = 'Bem-estar diário' limit 1;
  if v_id is null then
    insert into questionarios (clube_id, nome, perguntas) values (v_clube, 'Bem-estar diário',
      '[{"chave":"sono","pergunta":"Qualidade do sono","dica":"1 = muito ruim · 5 = excelente","min":1,"max":5},{"chave":"cansaco","pergunta":"Cansaço","dica":"1 = exausto · 5 = descansado","min":1,"max":5},{"chave":"dores","pergunta":"Dores","dica":"1 = muita dor · 5 = sem dor","min":1,"max":5},{"chave":"humor","pergunta":"Humor e disposição","dica":"1 = muito baixo · 5 = excelente","min":1,"max":5}]'::jsonb)
    returning id into v_id;
  end if;
  return v_id;
end $$;
