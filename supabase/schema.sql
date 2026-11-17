-- Handebol Hub: schema inicial (PostgreSQL / Supabase)
create extension if not exists "pgcrypto";

create type papel as enum ('gestor','diretor','treinador','preparador_fisico','analista','atleta');
create type tipo_sessao as enum ('treino','jogo','teste','recuperacao');
create type objetivo_exercicio as enum ('tecnico','tatico','fisico','goleiro');

-- Clubes (multi-clube desde o início evita refatoração depois)
create table clubes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_em timestamptz default now()
);

-- Perfil vinculado ao auth.users do Supabase
create table usuarios (
  id uuid primary key references auth.users on delete cascade,
  clube_id uuid not null references clubes,
  nome text not null,
  telefone text,
  ano_nascimento int,
  papel papel not null,
  posicao text,            -- só atletas: goleiro, ponta, central...
  ativo boolean default true,
  criado_em timestamptz default now()
);

-- Equipas: categoria (adulto, sub-19...) + escalão/gênero
create table equipas (
  id uuid primary key default gen_random_uuid(),
  clube_id uuid not null references clubes,
  nome text not null,
  categoria text not null,
  genero text check (genero in ('masculino','feminino','misto')),
  criado_em timestamptz default now()
);

create table membros_equipa (
  equipa_id uuid references equipas on delete cascade,
  usuario_id uuid references usuarios on delete cascade,
  numero_camisa int,
  primary key (equipa_id, usuario_id)
);

-- Biblioteca de exercícios
create table exercicios (
  id uuid primary key default gen_random_uuid(),
  clube_id uuid references clubes,          -- null = exercício global da plataforma
  autor_id uuid references usuarios,
  titulo text not null,
  descricao text,
  objetivo objetivo_exercicio not null,
  duracao_min int,
  intensidade_alvo int check (intensidade_alvo between 1 and 10),
  jogadores_min int,
  materiais text[],
  tags text[],
  pasta text,
  favorito_de uuid[] default '{}',
  video_url text,
  diagrama_id uuid,                          -- fk adicionada abaixo
  criado_em timestamptz default now()
);

-- Prancheta tática: o desenho inteiro fica em JSON versionável
create table diagramas (
  id uuid primary key default gen_random_uuid(),
  clube_id uuid not null references clubes,
  autor_id uuid references usuarios,
  titulo text not null,
  -- {"quadra":"completa","frames":[{"t":0,"jogadores":[{"id":"A1","x":0.4,"y":0.6,"time":"ataque"}],"bola":{"x":0.5,"y":0.5},"setas":[]}]}
  dados jsonb not null,
  criado_em timestamptz default now()
);
alter table exercicios add constraint exercicios_diagrama_fk foreign key (diagrama_id) references diagramas;

-- Calendário
create table sessoes (
  id uuid primary key default gen_random_uuid(),
  equipa_id uuid not null references equipas on delete cascade,
  tipo tipo_sessao not null default 'treino',
  titulo text not null,
  inicio timestamptz not null,
  duracao_min int not null,
  local text,
  adversario text,           -- jogos
  observacoes text,
  criado_por uuid references usuarios,
  criado_em timestamptz default now()
);

-- Conecta sessão a blocos de exercícios, em ordem
create table sessao_exercicios (
  sessao_id uuid references sessoes on delete cascade,
  exercicio_id uuid references exercicios,
  ordem int not null,
  duracao_min int,
  primary key (sessao_id, ordem)
);

create type status_presenca as enum ('presente','falta_doenca','falta_lesao','falta_outro');
create table presencas (
  sessao_id uuid references sessoes on delete cascade,
  atleta_id uuid references usuarios on delete cascade,
  status status_presenca not null,
  primary key (sessao_id, atleta_id)
);

-- Carga: RPE da sessão (escala CR-10 de Foster)
create table rpe_sessao (
  sessao_id uuid references sessoes on delete cascade,
  atleta_id uuid references usuarios on delete cascade,
  rpe int not null check (rpe between 0 and 10),
  minutos int not null,
  carga_ua int generated always as (rpe * minutos) stored,
  registrado_em timestamptz default now(),
  primary key (sessao_id, atleta_id)
);

-- Testes físicos
create table definicoes_teste (
  id uuid primary key default gen_random_uuid(),
  clube_id uuid references clubes,
  nome text not null,
  categoria text,            -- força, velocidade, resistência, salto, composição corporal
  unidade text not null,     -- kg, s, cm, bpm
  menor_e_melhor boolean default false
);

create table resultados_teste (
  id uuid primary key default gen_random_uuid(),
  definicao_id uuid not null references definicoes_teste,
  atleta_id uuid not null references usuarios on delete cascade,
  valor numeric not null,
  medido_em date not null default current_date,
  registrado_por uuid references usuarios
);
create index on resultados_teste (atleta_id, definicao_id, medido_em desc);

-- Questionários (bem-estar / RMI)
create table questionarios (
  id uuid primary key default gen_random_uuid(),
  clube_id uuid references clubes,
  nome text not null,
  -- [{"chave":"sono","pergunta":"Como foi seu sono?","min":1,"max":5}]
  perguntas jsonb not null
);

create table respostas_questionario (
  id uuid primary key default gen_random_uuid(),
  questionario_id uuid not null references questionarios,
  atleta_id uuid not null references usuarios on delete cascade,
  respondido_em timestamptz default now(),
  respostas jsonb not null   -- {"sono":4,"fadiga":2,"dor_muscular":3,"humor":4}
);
create index on respostas_questionario (atleta_id, respondido_em desc);

-- Segurança: ligue o RLS em TODAS as tabelas e crie policies por clube e papel.
-- Exemplo (repetir o padrão para as demais):
alter table equipas enable row level security;
create policy "membros do clube veem equipas" on equipas for select
  using (clube_id = (select clube_id from usuarios where id = auth.uid()));
