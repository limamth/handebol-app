-- Etapa 19: registro dos backups e "ping" para manter o projeto ativo no plano gratuito.
-- Rode no SQL Editor do Supabase DEPOIS do 015. Pode ser repetido sem erro.

-- Cada backup baixado pelo gestor fica registrado (para o app lembrar quando faz tempo)
create table if not exists registro_backup (
  id uuid primary key default gen_random_uuid(),
  clube_id uuid not null references clubes on delete cascade,
  feito_por uuid references usuarios on delete set null,
  feito_em timestamptz not null default now(),
  linhas int
);
alter table registro_backup enable row level security;
drop policy if exists "gestor gerencia o registro de backup" on registro_backup;
create policy "gestor gerencia o registro de backup" on registro_backup for all
  using (meu_papel() = 'gestor' and clube_id = meu_clube())
  with check (meu_papel() = 'gestor' and clube_id = meu_clube());

-- Chamada leve e pública que só toca o banco. Um agendador externo chama a cada poucos dias
-- para o Supabase não pausar o projeto por falta de uso. Não devolve nenhum dado.
create or replace function ping() returns boolean
language sql stable security definer set search_path = public as
$$ select (select count(*) from clubes) >= 0 $$;
grant execute on function ping() to anon, authenticated;
