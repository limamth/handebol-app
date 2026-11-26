-- Etapa 19: Notificações e Lembretes Automáticos para Atletas Convocados em Fases Ativas.
-- Rode no SQL Editor do Supabase DEPOIS do 018. Pode ser repetido sem erro.

-- 1. Subscrições de Push dos dispositivos dos atletas (Web Push / PWA)
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now(),
  unique(usuario_id, endpoint)
);

create index if not exists idx_push_subs_usuario on push_subscriptions(usuario_id);

alter table push_subscriptions enable row level security;

drop policy if exists "usuario gerencia suas subscricoes" on push_subscriptions;
create policy "usuario gerencia suas subscricoes" on push_subscriptions
  for all
  using (usuario_id = meu_usuario())
  with check (usuario_id = meu_usuario());

drop policy if exists "comissao le subscricoes do clube" on push_subscriptions;
create policy "comissao le subscricoes do clube" on push_subscriptions
  for select
  using (exists (select 1 from usuarios u where u.id = usuario_id and u.clube_id = meu_clube()));

-- 2. Configuração de Lembretes do Clube (Horário fixo diário)
create table if not exists configuracao_lembretes (
  clube_id uuid primary key references clubes on delete cascade,
  horario_lembrete time not null default '09:00:00',
  ativo boolean not null default true,
  ultimo_disparo date,
  atualizado_em timestamptz default now()
);

alter table configuracao_lembretes enable row level security;

drop policy if exists "ver configuracao lembretes" on configuracao_lembretes;
create policy "ver configuracao lembretes" on configuracao_lembretes
  for select
  using (clube_id = meu_clube());

drop policy if exists "comissao gerencia configuracao lembretes" on configuracao_lembretes;
create policy "comissao gerencia configuracao lembretes" on configuracao_lembretes
  for all
  using (clube_id = meu_clube() and pode_monitorar())
  with check (clube_id = meu_clube() and pode_monitorar());

-- 3. Histórico de Notificações / Auditoria de Envios
create table if not exists notificacoes_historico (
  id uuid primary key default gen_random_uuid(),
  clube_id uuid not null references clubes on delete cascade,
  atleta_id uuid not null references usuarios on delete cascade,
  fase_id uuid references fases_treinamento on delete set null,
  tipo text not null default 'bem_estar',
  dia date not null,
  horario time not null,
  status text not null, -- 'enviado', 'sem_subscricao', 'erro'
  detalhes text,
  enviado_em timestamptz default now()
);

create index if not exists idx_notif_hist_clube_dia on notificacoes_historico(clube_id, dia);
create index if not exists idx_notif_hist_atleta on notificacoes_historico(atleta_id);

alter table notificacoes_historico enable row level security;

drop policy if exists "ver historico notificacoes" on notificacoes_historico;
create policy "ver historico notificacoes" on notificacoes_historico
  for select
  using (clube_id = meu_clube());

drop policy if exists "comissao gerencia historico notificacoes" on notificacoes_historico;
create policy "comissao gerencia historico notificacoes" on notificacoes_historico
  for all
  using (clube_id = meu_clube() and pode_monitorar())
  with check (clube_id = meu_clube() and pode_monitorar());
