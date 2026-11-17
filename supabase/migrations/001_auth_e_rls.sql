-- Etapa 1: cadastro automático do clube + regras de acesso (RLS)
-- Rode DEPOIS do schema.sql, no SQL Editor do Supabase.

-- Funções auxiliares (security definer evita recursão nas policies)
create or replace function meu_clube() returns uuid
language sql stable security definer set search_path = public as
$$ select clube_id from usuarios where id = auth.uid() $$;

create or replace function meu_papel() returns papel
language sql stable security definer set search_path = public as
$$ select papel from usuarios where id = auth.uid() $$;

-- Ao criar conta com "clube_nome", cria o clube e o perfil de gestor
create or replace function ao_criar_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare novo_clube uuid;
begin
  if new.raw_user_meta_data ? 'clube_nome' then
    insert into clubes (nome) values (new.raw_user_meta_data->>'clube_nome') returning id into novo_clube;
    insert into usuarios (id, clube_id, nome, papel)
    values (new.id, novo_clube, coalesce(new.raw_user_meta_data->>'nome', new.email), 'gestor');
  end if;
  return new;
end $$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users for each row execute function ao_criar_usuario();

-- RLS
alter table clubes enable row level security;
alter table usuarios enable row level security;
alter table equipas enable row level security;
alter table membros_equipa enable row level security;

drop policy if exists "membros do clube veem equipas" on equipas;

create policy "ver meu clube" on clubes for select using (id = meu_clube());

create policy "ver usuarios do clube" on usuarios for select using (clube_id = meu_clube());
create policy "gestor edita usuarios" on usuarios for all
  using (clube_id = meu_clube() and meu_papel() = 'gestor')
  with check (clube_id = meu_clube() and meu_papel() = 'gestor');

create policy "ver equipas do clube" on equipas for select using (clube_id = meu_clube());
create policy "gestor e treinador editam equipas" on equipas for all
  using (clube_id = meu_clube() and meu_papel() in ('gestor','treinador'))
  with check (clube_id = meu_clube() and meu_papel() in ('gestor','treinador'));

create policy "ver membros do clube" on membros_equipa for select
  using (exists (select 1 from equipas e where e.id = equipa_id and e.clube_id = meu_clube()));
create policy "gestor e treinador editam membros" on membros_equipa for all
  using (meu_papel() in ('gestor','treinador') and exists (select 1 from equipas e where e.id = equipa_id and e.clube_id = meu_clube()))
  with check (meu_papel() in ('gestor','treinador') and exists (select 1 from equipas e where e.id = equipa_id and e.clube_id = meu_clube()));
