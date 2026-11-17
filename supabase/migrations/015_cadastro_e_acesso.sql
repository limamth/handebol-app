-- Etapa 18: cadastro só com autorização e redefinição de acesso.
-- Rode no SQL Editor do Supabase DEPOIS do 014. Pode ser repetido sem erro.

-- 1) A tela de entrada consulta se ainda é possível criar um clube (só enquanto não existe nenhum)
create or replace function pode_criar_clube() returns boolean
language sql stable security definer set search_path = public as
$$ select not exists (select 1 from clubes) $$;
grant execute on function pode_criar_clube() to anon, authenticated;

-- 2) Nenhuma conta nasce sem autorização: só o primeiro clube ou um código de acesso válido.
--    Isso vale também para quem chamar o serviço de login diretamente, fora do app.
create or replace function ao_criar_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare novo_clube uuid; alvo uuid;
begin
  if new.raw_user_meta_data ? 'clube_nome' then
    if exists (select 1 from clubes) then
      raise exception 'A criação de novos clubes está desativada.';
    end if;
    insert into clubes (nome) values (new.raw_user_meta_data->>'clube_nome') returning id into novo_clube;
    insert into usuarios (id, auth_id, clube_id, nome, papel)
    values (new.id, new.id, novo_clube, coalesce(new.raw_user_meta_data->>'nome', new.email), 'gestor');
  elsif new.raw_user_meta_data ? 'codigo_convite' then
    select usuario_id into alvo from convites where codigo = upper(trim(new.raw_user_meta_data->>'codigo_convite'));
    if alvo is null then
      raise exception 'Código de acesso inválido ou já utilizado.';
    end if;
    update usuarios set auth_id = new.id where id = alvo and auth_id is null;
    delete from convites where usuario_id = alvo;
  else
    raise exception 'Cadastro não autorizado.';
  end if;
  return new;
end $$;

-- 3) Redefinir acesso (esqueceu a senha): só o gestor. Apaga o login antigo e gera um código novo;
--    a pessoa usa o código em "primeiro acesso" e cria uma senha nova. O cadastro e o histórico ficam.
create or replace function redefinir_acesso(p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare alvo usuarios%rowtype; v_codigo text;
begin
  if meu_papel() is distinct from 'gestor' then
    raise exception 'Só o gestor pode redefinir acessos.';
  end if;
  select * into alvo from usuarios where id = p_id and clube_id = meu_clube();
  if not found then raise exception 'Usuário não encontrado.'; end if;
  if alvo.auth_id is null then raise exception 'Este usuário ainda não criou a conta.'; end if;
  if alvo.auth_id = auth.uid() then raise exception 'Você não pode redefinir o próprio acesso.'; end if;

  delete from auth.users where id = alvo.auth_id;
  update usuarios set auth_id = null where id = p_id;

  v_codigo := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into convites (usuario_id, codigo) values (p_id, v_codigo)
  on conflict (usuario_id) do update set codigo = excluded.codigo;
  return v_codigo;
end $$;
revoke all on function redefinir_acesso(uuid) from public, anon;
grant execute on function redefinir_acesso(uuid) to authenticated;
