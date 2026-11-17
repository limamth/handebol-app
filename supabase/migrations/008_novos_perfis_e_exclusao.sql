-- Etapa 8: perfis simplificados (gestor, diretor, comissão técnica, atleta) e exclusão de usuários.
-- Rode no SQL Editor do Supabase DEPOIS do 007. Rode UMA vez só.

-- 1) "treinador" vira "comissão técnica" (as regras que já citavam treinador passam a valer para ela)
do $$
begin
  if exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'papel' and e.enumlabel = 'treinador') then
    alter type papel rename value 'treinador' to 'comissao_tecnica';
  end if;
end $$;

-- 2) Quem era preparador físico ou analista passa a ser comissão técnica
update usuarios set papel = 'comissao_tecnica' where papel in ('preparador_fisico', 'analista');

-- 3) Comissão técnica edita tudo, exceto utilizadores (esses ficam só com o gestor)
create or replace function pode_planejar() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(meu_papel() in ('gestor', 'comissao_tecnica'), false) $$;

create or replace function pode_montar_taticas() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(meu_papel() in ('gestor', 'comissao_tecnica'), false) $$;

create or replace function pode_gerir_exercicios() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(meu_papel() in ('gestor', 'comissao_tecnica'), false) $$;

create or replace function pode_monitorar() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(meu_papel() in ('gestor', 'comissao_tecnica'), false) $$;

create or replace function pode_avaliar() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(meu_papel() in ('gestor', 'comissao_tecnica'), false) $$;

-- Musculação: o atleta registra os próprios dias; gestor e comissão técnica podem registrar por ele
drop policy if exists "registrar forca" on sessoes_forca;
create policy "registrar forca" on sessoes_forca for all
  using (exists (select 1 from usuarios u where u.id = atleta_id and u.clube_id = meu_clube())
         and (atleta_id = meu_usuario() or meu_papel() in ('gestor', 'comissao_tecnica')))
  with check (exists (select 1 from usuarios u where u.id = atleta_id and u.clube_id = meu_clube())
         and (atleta_id = meu_usuario() or meu_papel() in ('gestor', 'comissao_tecnica')));

-- 4) Quem criou sessões, exercícios, jogadas ou testes pode ser excluído: o registro fica, sem autor
alter table sessoes drop constraint if exists sessoes_criado_por_fkey;
alter table sessoes add constraint sessoes_criado_por_fkey foreign key (criado_por) references usuarios(id) on delete set null;
alter table exercicios drop constraint if exists exercicios_autor_id_fkey;
alter table exercicios add constraint exercicios_autor_id_fkey foreign key (autor_id) references usuarios(id) on delete set null;
alter table diagramas drop constraint if exists diagramas_autor_id_fkey;
alter table diagramas add constraint diagramas_autor_id_fkey foreign key (autor_id) references usuarios(id) on delete set null;
alter table resultados_teste drop constraint if exists resultados_teste_registrado_por_fkey;
alter table resultados_teste add constraint resultados_teste_registrado_por_fkey foreign key (registrado_por) references usuarios(id) on delete set null;
alter table sessoes_forca drop constraint if exists sessoes_forca_registrado_por_fkey;
alter table sessoes_forca add constraint sessoes_forca_registrado_por_fkey foreign key (registrado_por) references usuarios(id) on delete set null;

-- 5) Exclusão de usuário: só o gestor, só do próprio clube, nunca a própria conta.
--    Apaga o perfil, o histórico dele e também o login (auth.users).
create or replace function excluir_usuario(p_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare alvo usuarios%rowtype;
begin
  if meu_papel() is distinct from 'gestor' then
    raise exception 'Só o gestor pode excluir usuários.';
  end if;
  select * into alvo from usuarios where id = p_id and clube_id = meu_clube();
  if not found then return false; end if;
  if alvo.auth_id is not null and alvo.auth_id = auth.uid() then
    raise exception 'Você não pode excluir a própria conta.';
  end if;
  delete from usuarios where id = p_id;
  if alvo.auth_id is not null then
    delete from auth.users where id = alvo.auth_id;
  end if;
  return true;
end $$;
revoke all on function excluir_usuario(uuid) from public, anon;
grant execute on function excluir_usuario(uuid) to authenticated;
