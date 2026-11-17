-- Etapa 5: acesso dos atletas (código de convite) e acompanhamento da musculação.
-- Rode no SQL Editor do Supabase DEPOIS do 005.

create or replace function meu_usuario() returns uuid
language sql stable security definer set search_path = public as
$$ select id from usuarios where auth_id = auth.uid() $$;

-- Códigos de acesso: só a comissão (gestor e treinador) enxerga; atletas não.
create table if not exists convites (
  usuario_id uuid primary key references usuarios on delete cascade,
  codigo text not null unique,
  criado_em timestamptz default now()
);
alter table convites enable row level security;
create policy "comissao gerencia convites" on convites for all
  using (meu_papel() in ('gestor','treinador') and exists (select 1 from usuarios u where u.id = usuario_id and u.clube_id = meu_clube() and u.auth_id is null))
  with check (meu_papel() in ('gestor','treinador') and exists (select 1 from usuarios u where u.id = usuario_id and u.clube_id = meu_clube() and u.auth_id is null));

-- A tela de cadastro confere o código antes de criar a conta
create or replace function codigo_valido(p_codigo text) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from convites where codigo = upper(trim(p_codigo))) $$;
grant execute on function codigo_valido(text) to anon, authenticated;

-- Ao criar a conta: ou cria um clube (gestor) ou vincula a conta ao atleta dono do código
create or replace function ao_criar_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare novo_clube uuid; alvo uuid;
begin
  if new.raw_user_meta_data ? 'clube_nome' then
    insert into clubes (nome) values (new.raw_user_meta_data->>'clube_nome') returning id into novo_clube;
    insert into usuarios (id, auth_id, clube_id, nome, papel)
    values (new.id, new.id, novo_clube, coalesce(new.raw_user_meta_data->>'nome', new.email), 'gestor');
  elsif new.raw_user_meta_data ? 'codigo_convite' then
    select usuario_id into alvo from convites where codigo = upper(trim(new.raw_user_meta_data->>'codigo_convite'));
    if alvo is not null then
      update usuarios set auth_id = new.id where id = alvo and auth_id is null;
      delete from convites where usuario_id = alvo;
    end if;
  end if;
  return new;
end $$;

-- Musculação: um registro por atleta por dia
create table if not exists sessoes_forca (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references usuarios on delete cascade,
  dia date not null,
  treino text,
  duracao_min int check (duracao_min between 1 and 300),
  rpe int check (rpe between 0 and 10),
  execucao text not null default 'completo' check (execucao in ('completo','parcial','adaptado')),
  carga_percebida text not null default 'adequada' check (carga_percebida in ('leve','adequada','pesada')),
  disposicao int check (disposicao between 1 and 5),
  dor text not null default 'nenhuma' check (dor in ('nenhuma','leve','moderada','forte')),
  dor_local text,
  comentario text,
  carga_ua int generated always as (rpe * duracao_min) stored,
  registrado_por uuid references usuarios,
  criado_em timestamptz default now(),
  unique (atleta_id, dia)
);
create index if not exists sessoes_forca_atleta_dia on sessoes_forca (atleta_id, dia desc);

alter table sessoes_forca enable row level security;
-- O atleta vê só os próprios registros; a comissão vê os do clube.
create policy "ver registros de forca" on sessoes_forca for select
  using (exists (select 1 from usuarios u where u.id = atleta_id and u.clube_id = meu_clube())
         and (atleta_id = meu_usuario() or meu_papel() <> 'atleta'));
-- O atleta registra os próprios dias; gestor e preparador físico podem registrar por ele.
create policy "registrar forca" on sessoes_forca for all
  using (exists (select 1 from usuarios u where u.id = atleta_id and u.clube_id = meu_clube())
         and (atleta_id = meu_usuario() or meu_papel() in ('gestor','preparador_fisico')))
  with check (exists (select 1 from usuarios u where u.id = atleta_id and u.clube_id = meu_clube())
         and (atleta_id = meu_usuario() or meu_papel() in ('gestor','preparador_fisico')));
