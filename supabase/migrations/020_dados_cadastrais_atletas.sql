-- Migração 020: Central de dados cadastrais dos atletas e oficiais, campos dinâmicos e upload de fotos
-- Executar no SQL Editor do Supabase após a 019.

-- 1) Definição de campos do cadastro (dinâmicos por clube)
create table if not exists campos_cadastro_atleta (
  id uuid primary key default gen_random_uuid(),
  clube_id uuid not null references clubes(id) on delete cascade,
  chave text not null,
  rotulo text not null,
  categoria text not null default 'pessoal', -- pessoal, contato_endereco, documentos, passaporte_viagem, uniformes, outros
  tipo text not null default 'texto', -- texto, data, numero, selecao
  opcoes jsonb default null, -- array de strings para tipo = 'selecao'
  permite_foto boolean not null default false,
  obrigatorio boolean not null default false,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  constraint uq_campo_clube_chave unique (clube_id, chave)
);

-- 2) Dados preenchidos de cada atleta/oficial
create table if not exists dados_cadastrais_atleta (
  id uuid primary key default gen_random_uuid(),
  clube_id uuid not null references clubes(id) on delete cascade,
  atleta_id uuid not null references usuarios(id) on delete cascade,
  valores jsonb not null default '{}'::jsonb,
  fotos jsonb not null default '{}'::jsonb,
  checado boolean not null default false,
  atualizado_por uuid references usuarios(id) on delete set null,
  atualizado_em timestamptz not null default now(),
  constraint uq_dados_clube_atleta unique (clube_id, atleta_id)
);

-- Habilitar RLS
alter table campos_cadastro_atleta enable row level security;
alter table dados_cadastrais_atleta enable row level security;

-- Políticas para campos_cadastro_atleta
drop policy if exists "ver campos cadastro clube" on campos_cadastro_atleta;
create policy "ver campos cadastro clube" on campos_cadastro_atleta for select
  using (clube_id = meu_clube());

drop policy if exists "staff edita campos cadastro" on campos_cadastro_atleta;
create policy "staff edita campos cadastro" on campos_cadastro_atleta for all
  using (clube_id = meu_clube() and meu_papel() in ('gestor', 'comissao_tecnica'))
  with check (clube_id = meu_clube() and meu_papel() in ('gestor', 'comissao_tecnica'));

-- Políticas para dados_cadastrais_atleta
-- Atletas: só veem e editam os PRÓPRIOS dados
-- Comissão Técnica / Gestor / Diretor: veem todos os dados do clube
-- Comissão Técnica / Gestor: podem editar qualquer dado do clube
drop policy if exists "ver dados cadastrais" on dados_cadastrais_atleta;
create policy "ver dados cadastrais" on dados_cadastrais_atleta for select
  using (
    clube_id = meu_clube() and (
      atleta_id = meu_usuario()
      or meu_papel() in ('gestor', 'comissao_tecnica', 'diretor')
    )
  );

drop policy if exists "atualizar dados cadastrais" on dados_cadastrais_atleta;
create policy "atualizar dados cadastrais" on dados_cadastrais_atleta for update
  using (
    clube_id = meu_clube() and (
      atleta_id = meu_usuario()
      or meu_papel() in ('gestor', 'comissao_tecnica')
    )
  )
  with check (
    clube_id = meu_clube() and (
      atleta_id = meu_usuario()
      or meu_papel() in ('gestor', 'comissao_tecnica')
    )
  );

drop policy if exists "inserir dados cadastrais" on dados_cadastrais_atleta;
create policy "inserir dados cadastrais" on dados_cadastrais_atleta for insert
  with check (
    clube_id = meu_clube() and (
      atleta_id = meu_usuario()
      or meu_papel() in ('gestor', 'comissao_tecnica')
    )
  );

drop policy if exists "excluir dados cadastrais" on dados_cadastrais_atleta;
create policy "excluir dados cadastrais" on dados_cadastrais_atleta for delete
  using (
    clube_id = meu_clube() and meu_papel() in ('gestor', 'comissao_tecnica')
  );

-- Função para semear campos padrão da planilha em um clube
create or replace function seed_campos_cadastro_padrao(p_clube_id uuid)
returns void language plpgsql security definer as $$
declare
  tamanhos_vestuario jsonb := '["PP", "P", "M", "G", "GG", "2G", "3G", "4G", "5G", "6G"]'::jsonb;
  tamanhos_calcado jsonb := '["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48"]'::jsonb;
  tamanhos_meias jsonb := '["P", "M", "G", "GG", "2G", "3G", "4G", "5G"]'::jsonb;
  tipos_cadastro jsonb := '["Atleta", "Oficial"]'::jsonb;
begin
  -- Pessoal
  insert into campos_cadastro_atleta (clube_id, chave, rotulo, categoria, tipo, opcoes, permite_foto, obrigatorio, ordem) values
    (p_clube_id, 'tipo_cadastro', 'Tipo', 'pessoal', 'selecao', tipos_cadastro, false, true, 10),
    (p_clube_id, 'nome_completo', 'Nome Completo', 'pessoal', 'texto', null, false, true, 20),
    (p_clube_id, 'data_nascimento', 'Data de Nascimento', 'pessoal', 'data', null, false, false, 30),
    (p_clube_id, 'altura', 'Altura', 'pessoal', 'texto', null, false, false, 40),
    (p_clube_id, 'peso', 'Peso', 'pessoal', 'texto', null, false, false, 50),
    (p_clube_id, 'nome_preferido', 'Nome Preferido', 'pessoal', 'texto', null, false, false, 60),
    (p_clube_id, 'sobrenome_preferido', 'Sobrenome Preferido', 'pessoal', 'texto', null, false, false, 70),
    (p_clube_id, 'nome_pai', 'Nome do Pai', 'pessoal', 'texto', null, false, false, 80),
    (p_clube_id, 'nome_mae', 'Nome da Mãe', 'pessoal', 'texto', null, false, false, 90),
    (p_clube_id, 'funcao', 'Função', 'pessoal', 'texto', null, false, false, 100),
    (p_clube_id, 'nacionalidade', 'Nacionalidade', 'pessoal', 'texto', null, false, false, 110),
    (p_clube_id, 'naturalidade_pais', 'Naturalidade País', 'pessoal', 'texto', null, false, false, 120),
    (p_clube_id, 'naturalidade_estado', 'Naturalidade Estado', 'pessoal', 'texto', null, false, false, 130),
    (p_clube_id, 'naturalidade_cidade', 'Naturalidade Cidade', 'pessoal', 'texto', null, false, false, 140),
    (p_clube_id, 'foto_perfil', 'Foto 3x4 / Perfil', 'pessoal', 'texto', null, true, false, 150)
  on conflict (clube_id, chave) do nothing;

  -- Contato & Endereço
  insert into campos_cadastro_atleta (clube_id, chave, rotulo, categoria, tipo, opcoes, permite_foto, obrigatorio, ordem) values
    (p_clube_id, 'contato', 'Telefone / WhatsApp', 'contato_endereco', 'texto', null, false, false, 200),
    (p_clube_id, 'email', 'E-mail', 'contato_endereco', 'texto', null, false, false, 210),
    (p_clube_id, 'endereco', 'Endereço Completo', 'contato_endereco', 'texto', null, false, false, 220),
    (p_clube_id, 'cidade', 'Cidade', 'contato_endereco', 'texto', null, false, false, 230),
    (p_clube_id, 'estado', 'Estado', 'contato_endereco', 'texto', null, false, false, 240),
    (p_clube_id, 'pais', 'País', 'contato_endereco', 'texto', null, false, false, 250)
  on conflict (clube_id, chave) do nothing;

  -- Documentos Nacionais
  insert into campos_cadastro_atleta (clube_id, chave, rotulo, categoria, tipo, opcoes, permite_foto, obrigatorio, ordem) values
    (p_clube_id, 'cpf', 'CPF', 'documentos', 'texto', null, false, false, 300),
    (p_clube_id, 'rg_numero', 'Nº RG', 'documentos', 'texto', null, false, false, 310),
    (p_clube_id, 'rg_orgao_emissor', 'Órgão Emissor RG', 'documentos', 'texto', null, false, false, 320),
    (p_clube_id, 'rg_estado_emissor', 'Estado Emissor RG', 'documentos', 'texto', null, false, false, 330),
    (p_clube_id, 'rg_data_emissao', 'Data de Emissão RG', 'documentos', 'data', null, false, false, 340),
    (p_clube_id, 'rg_data_validade', 'Data de Validade RG', 'documentos', 'texto', null, false, false, 350),
    (p_clube_id, 'foto_rg', 'Foto do RG / Documento', 'documentos', 'texto', null, true, false, 360)
  on conflict (clube_id, chave) do nothing;

  -- Passaporte & Viagens Internacionais
  insert into campos_cadastro_atleta (clube_id, chave, rotulo, categoria, tipo, opcoes, permite_foto, obrigatorio, ordem) values
    (p_clube_id, 'passaporte_nome', 'Nome Conforme Passaporte', 'passaporte_viagem', 'texto', null, false, false, 400),
    (p_clube_id, 'passaporte_sobrenome', 'Sobrenome Conforme Passaporte', 'passaporte_viagem', 'texto', null, false, false, 410),
    (p_clube_id, 'passaporte_numero', 'Nº Passaporte', 'passaporte_viagem', 'texto', null, false, false, 420),
    (p_clube_id, 'passaporte_emissao', 'Emissão Passaporte', 'passaporte_viagem', 'data', null, false, false, 430),
    (p_clube_id, 'passaporte_validade', 'Validade Passaporte', 'passaporte_viagem', 'data', null, false, false, 440),
    (p_clube_id, 'visto_usa_validade', 'Validade Visto USA / Ñ tenho', 'passaporte_viagem', 'texto', null, false, false, 450),
    (p_clube_id, 'foto_passaporte', 'Foto do Passaporte', 'passaporte_viagem', 'texto', null, true, false, 460),
    (p_clube_id, 'foto_visto', 'Foto do Visto USA', 'passaporte_viagem', 'texto', null, true, false, 470)
  on conflict (clube_id, chave) do nothing;

  -- Uniformes e Tamanhos
  insert into campos_cadastro_atleta (clube_id, chave, rotulo, categoria, tipo, opcoes, permite_foto, obrigatorio, ordem) values
    (p_clube_id, 'agasalho', 'Agasalho', 'uniformes', 'selecao', tamanhos_vestuario, false, false, 500),
    (p_clube_id, 'bermuda_social', 'Bermuda Social', 'uniformes', 'selecao', tamanhos_vestuario, false, false, 510),
    (p_clube_id, 'calca', 'Calça', 'uniformes', 'selecao', tamanhos_vestuario, false, false, 520),
    (p_clube_id, 'calca_social', 'Calça Social', 'uniformes', 'selecao', tamanhos_vestuario, false, false, 530),
    (p_clube_id, 'camisa', 'Camisa', 'uniformes', 'selecao', tamanhos_vestuario, false, false, 540),
    (p_clube_id, 'camisa_termica', 'Camisa Térmica', 'uniformes', 'selecao', tamanhos_vestuario, false, false, 550),
    (p_clube_id, 'camisa_polo', 'Camisa Polo', 'uniformes', 'selecao', tamanhos_vestuario, false, false, 560),
    (p_clube_id, 'camisa_regata', 'Camisa Regata', 'uniformes', 'selecao', tamanhos_vestuario, false, false, 570),
    (p_clube_id, 'capa_chuva', 'Capa de Chuva', 'uniformes', 'selecao', tamanhos_vestuario, false, false, 580),
    (p_clube_id, 'chinelo', 'Chinelo', 'uniformes', 'selecao', tamanhos_calcado, false, false, 590),
    (p_clube_id, 'jaqueta', 'Jaqueta', 'uniformes', 'selecao', tamanhos_vestuario, false, false, 600),
    (p_clube_id, 'legging_termica', 'Legging Térmica', 'uniformes', 'selecao', tamanhos_vestuario, false, false, 610),
    (p_clube_id, 'meias', 'Meias', 'uniformes', 'selecao', tamanhos_meias, false, false, 620),
    (p_clube_id, 'short', 'Short', 'uniformes', 'selecao', tamanhos_vestuario, false, false, 630),
    (p_clube_id, 'short_termico', 'Short Térmico', 'uniformes', 'selecao', tamanhos_vestuario, false, false, 640),
    (p_clube_id, 'sunga', 'Sunga', 'uniformes', 'selecao', tamanhos_vestuario, false, false, 650),
    (p_clube_id, 'tenis', 'Tênis', 'uniformes', 'selecao', tamanhos_calcado, false, false, 660)
  on conflict (clube_id, chave) do nothing;
end;
$$;

-- Disparar seed automática para clubes existentes
do $$
declare r record;
begin
  for r in select id from clubes loop
    perform seed_campos_cadastro_padrao(r.id);
  end loop;
end $$;
