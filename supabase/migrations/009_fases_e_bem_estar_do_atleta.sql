-- Etapa 9: fases de treinamento e bem-estar preenchido pelo próprio atleta.
-- Rode no SQL Editor do Supabase DEPOIS do 008.

-- Data de hoje no fuso de Brasília
create or replace function hoje_sp() returns date
language sql stable as
$$ select (now() at time zone 'America/Sao_Paulo')::date $$;

-- Fases de treinamento: o questionário fica aberto para os atletas só dentro dessas datas
create table if not exists fases_treinamento (
  id uuid primary key default gen_random_uuid(),
  clube_id uuid not null references clubes,
  nome text not null,
  inicio date not null,
  fim date not null,
  criado_em timestamptz default now(),
  check (fim >= inicio)
);
alter table fases_treinamento enable row level security;

create policy "ver fases do clube" on fases_treinamento for select using (clube_id = meu_clube());
create policy "comissao gerencia fases" on fases_treinamento for all
  using (clube_id = meu_clube() and pode_monitorar())
  with check (clube_id = meu_clube() and pode_monitorar());

create or replace function fase_ativa() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from fases_treinamento f where f.clube_id = meu_clube() and hoje_sp() between f.inicio and f.fim) $$;

-- Garante que o clube tenha o questionário de bem-estar (o atleta não tem permissão para criá-lo)
create or replace function garantir_questionario() returns uuid
language plpgsql security definer set search_path = public as $$
declare v_clube uuid; v_id uuid;
begin
  v_clube := meu_clube();
  if v_clube is null then raise exception 'Sem acesso.'; end if;
  select id into v_id from questionarios where clube_id = v_clube and nome = 'Bem-estar diário' limit 1;
  if v_id is null then
    insert into questionarios (clube_id, nome, perguntas) values (v_clube, 'Bem-estar diário',
      '[{"chave":"sono","pergunta":"Qualidade do sono","min":1,"max":5},{"chave":"energia","pergunta":"Energia (pouca fadiga)","min":1,"max":5},{"chave":"musculos","pergunta":"Músculos (pouca dor)","min":1,"max":5},{"chave":"estresse","pergunta":"Estresse (pouco estresse)","min":1,"max":5},{"chave":"humor","pergunta":"Humor","min":1,"max":5}]'::jsonb)
    returning id into v_id;
  end if;
  return v_id;
end $$;
revoke all on function garantir_questionario() from public, anon;
grant execute on function garantir_questionario() to authenticated;

-- O atleta lê e escreve só o próprio bem-estar, só hoje e só durante uma fase de treinamento
create policy "atleta ve o proprio bem-estar" on respostas_questionario for select
  using (atleta_id = meu_usuario());
create policy "atleta registra o proprio bem-estar" on respostas_questionario for insert
  with check (atleta_id = meu_usuario() and fase_ativa() and dia = hoje_sp());
create policy "atleta corrige o proprio bem-estar" on respostas_questionario for update
  using (atleta_id = meu_usuario() and fase_ativa() and dia = hoje_sp())
  with check (atleta_id = meu_usuario() and fase_ativa() and dia = hoje_sp());
