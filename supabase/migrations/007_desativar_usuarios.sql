-- Etapa 7: membro da comissão desativado perde o acesso (no banco, não só na tela).
-- Rode no SQL Editor do Supabase DEPOIS do 006.
-- Atletas desativados continuam entrando: para eles "ativo" só tira das listas.

create or replace function meu_clube() returns uuid
language sql stable security definer set search_path = public as
$$ select clube_id from usuarios where auth_id = auth.uid() and (coalesce(ativo, true) or papel = 'atleta') $$;

create or replace function meu_papel() returns papel
language sql stable security definer set search_path = public as
$$ select papel from usuarios where auth_id = auth.uid() and (coalesce(ativo, true) or papel = 'atleta') $$;
