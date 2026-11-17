-- Etapa 1b: permite cadastrar atletas que ainda não têm conta de login.
-- Rode no SQL Editor do Supabase DEPOIS do 001.

alter table usuarios drop constraint if exists usuarios_id_fkey;
alter table usuarios alter column id set default gen_random_uuid();
alter table usuarios add column if not exists auth_id uuid unique references auth.users on delete set null;
update usuarios set auth_id = id where auth_id is null;   -- quem já existe usava o mesmo id do login

create or replace function meu_clube() returns uuid
language sql stable security definer set search_path = public as
$$ select clube_id from usuarios where auth_id = auth.uid() $$;

create or replace function meu_papel() returns papel
language sql stable security definer set search_path = public as
$$ select papel from usuarios where auth_id = auth.uid() $$;

create or replace function ao_criar_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare novo_clube uuid;
begin
  if new.raw_user_meta_data ? 'clube_nome' then
    insert into clubes (nome) values (new.raw_user_meta_data->>'clube_nome') returning id into novo_clube;
    insert into usuarios (id, auth_id, clube_id, nome, papel)
    values (new.id, new.id, novo_clube, coalesce(new.raw_user_meta_data->>'nome', new.email), 'gestor');
  end if;
  return new;
end $$;

-- Gestor e treinador cadastram e editam atletas do próprio clube
create policy "comissao cadastra atletas" on usuarios for insert
  with check (clube_id = meu_clube() and papel = 'atleta' and meu_papel() in ('gestor','treinador'));
create policy "comissao edita atletas" on usuarios for update
  using (clube_id = meu_clube() and papel = 'atleta' and meu_papel() in ('gestor','treinador'))
  with check (clube_id = meu_clube() and papel = 'atleta' and meu_papel() in ('gestor','treinador'));
