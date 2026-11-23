-- Etapa 20: ativar e desativar funções do app. Rode no SQL Editor do Supabase DEPOIS do 016. Pode ser repetido sem erro.

create or replace function pode_configurar() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(meu_papel() in ('gestor', 'comissao_tecnica'), false) $$;

-- Sem registro, a função está ativa. Só as funções desativadas precisam de linha com ativo = false.
create table if not exists configuracoes_modulos (
  clube_id uuid not null references clubes on delete cascade,
  modulo text not null,
  ativo boolean not null default true,
  atualizado_por uuid references usuarios on delete set null,
  atualizado_em timestamptz not null default now(),
  primary key (clube_id, modulo)
);
alter table configuracoes_modulos enable row level security;
drop policy if exists "ver configuracoes de funcoes" on configuracoes_modulos;
drop policy if exists "comissao altera configuracoes de funcoes" on configuracoes_modulos;
create policy "ver configuracoes de funcoes" on configuracoes_modulos for select using (clube_id = meu_clube());
create policy "comissao altera configuracoes de funcoes" on configuracoes_modulos for all
  using (pode_configurar() and clube_id = meu_clube())
  with check (pode_configurar() and clube_id = meu_clube());

-- Para começar: a Musculação fica desativada. (Se você ativar depois, rodar este arquivo de novo não a desativa.)
insert into configuracoes_modulos (clube_id, modulo, ativo)
select id, 'musculacao', false from clubes
on conflict (clube_id, modulo) do nothing;
