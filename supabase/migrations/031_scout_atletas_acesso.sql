-- Migração 031: Controle individual de quais atletas podem visualizar a tela de Scout
-- Executar no SQL Editor do Supabase após a 030.

alter table usuarios
  add column if not exists pode_ver_scout boolean not null default false;

create or replace function definir_acesso_scout_atletas(p_atletas_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clube uuid := meu_clube();
  v_papel text := meu_papel();
begin
  if v_clube is null or v_papel not in ('gestor', 'comissao_tecnica') then
    raise exception 'Sem permissão para alterar acesso ao Scout.';
  end if;

  update usuarios
     set pode_ver_scout = false
   where clube_id = v_clube
     and papel = 'atleta';

  if p_atletas_ids is not null and array_length(p_atletas_ids, 1) > 0 then
    update usuarios
       set pode_ver_scout = true
     where clube_id = v_clube
       and papel = 'atleta'
       and id = any(p_atletas_ids);
  end if;
end;
$$;
