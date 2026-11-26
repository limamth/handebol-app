import type { SupabaseClient } from "@supabase/supabase-js";

export type CategoriaCampo =
  | "pessoal"
  | "contato_endereco"
  | "documentos"
  | "passaporte_viagem"
  | "uniformes"
  | "outros";

export type TipoCampo = "texto" | "data" | "numero" | "selecao";

export interface CampoCadastro {
  id: string;
  clube_id: string;
  chave: string;
  rotulo: string;
  categoria: CategoriaCampo;
  tipo: TipoCampo;
  opcoes?: string[] | null;
  permite_foto: boolean;
  obrigatorio: boolean;
  ordem: number;
  criado_em?: string;
}

export interface RegistroCadastral {
  id?: string;
  clube_id: string;
  atleta_id: string;
  valores: Record<string, string>;
  fotos: Record<string, string>;
  checado: boolean;
  atualizado_por?: string | null;
  atualizado_em?: string;
  // Joins opcionais
  atleta?: {
    id: string;
    nome: string;
    papel: string;
    ativo: boolean;
    posicao?: string | null;
    ano_nascimento?: number | null;
  };
}

export const CATEGORIAS_CAMPOS: { chave: CategoriaCampo; rotulo: string; descricao: string }[] = [
  { chave: "pessoal", rotulo: "Identificação Pessoal", descricao: "Nome, nascimento, altura, peso, filiação, naturalidade" },
  { chave: "contato_endereco", rotulo: "Contato & Endereço", descricao: "Telefones, WhatsApp, e-mail e endereço residencial" },
  { chave: "documentos", rotulo: "Documentos Nacionais", descricao: "CPF, RG, órgão expedidor, validade e cópias" },
  { chave: "passaporte_viagem", rotulo: "Passaporte & Viagens", descricao: "Passaporte, emissão, validade, visto americano" },
  { chave: "uniformes", rotulo: "Uniformes & Tamanhos", descricao: "Tamanhos de agasalhos, camisas, calças, bermudas e calçados" },
  { chave: "outros", rotulo: "Campos Extras / Personalizados", descricao: "Campos criados livremente pela comissão técnica" },
];

export const TAMANHOS_VESTUARIO = ["PP", "P", "M", "G", "GG", "2G", "3G", "4G", "5G", "6G"];
export const TAMANHOS_CALCADO = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48"];
export const TAMANHOS_MEIAS = ["P", "M", "G", "GG", "2G", "3G", "4G", "5G"];

export const CAMPOS_PADRAO_INICIAIS: Omit<CampoCadastro, "id" | "clube_id">[] = [
  // Pessoal
  { chave: "tipo_cadastro", rotulo: "Tipo (Atleta / Oficial)", categoria: "pessoal", tipo: "selecao", opcoes: ["Atleta", "Oficial"], permite_foto: false, obrigatorio: true, ordem: 10 },
  { chave: "nome_completo", rotulo: "Nome Completo", categoria: "pessoal", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: true, ordem: 20 },
  { chave: "data_nascimento", rotulo: "Data de Nascimento", categoria: "pessoal", tipo: "data", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 30 },
  { chave: "altura", rotulo: "Altura", categoria: "pessoal", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 40 },
  { chave: "peso", rotulo: "Peso", categoria: "pessoal", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 50 },
  { chave: "nome_preferido", rotulo: "Nome Preferido", categoria: "pessoal", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 60 },
  { chave: "sobrenome_preferido", rotulo: "Sobrenome Preferido", categoria: "pessoal", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 70 },
  { chave: "nome_pai", rotulo: "Nome do Pai", categoria: "pessoal", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 80 },
  { chave: "nome_mae", rotulo: "Nome da Mãe", categoria: "pessoal", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 90 },
  { chave: "funcao", rotulo: "Função", categoria: "pessoal", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 100 },
  { chave: "nacionalidade", rotulo: "Nacionalidade", categoria: "pessoal", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 110 },
  { chave: "naturalidade_pais", rotulo: "Naturalidade País", categoria: "pessoal", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 120 },
  { chave: "naturalidade_estado", rotulo: "Naturalidade Estado", categoria: "pessoal", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 130 },
  { chave: "naturalidade_cidade", rotulo: "Naturalidade Cidade", categoria: "pessoal", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 140 },
  { chave: "foto_perfil", rotulo: "Foto 3x4 / Perfil", categoria: "pessoal", tipo: "texto", opcoes: null, permite_foto: true, obrigatorio: false, ordem: 150 },

  // Contato & Endereço
  { chave: "contato", rotulo: "Telefone / WhatsApp", categoria: "contato_endereco", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 200 },
  { chave: "email", rotulo: "E-mail", categoria: "contato_endereco", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 210 },
  { chave: "endereco", rotulo: "Endereço Residencial", categoria: "contato_endereco", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 220 },
  { chave: "cidade", rotulo: "Cidade", categoria: "contato_endereco", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 230 },
  { chave: "estado", rotulo: "Estado", categoria: "contato_endereco", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 240 },
  { chave: "pais", rotulo: "País", categoria: "contato_endereco", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 250 },

  // Documentos Nacionais
  { chave: "cpf", rotulo: "CPF", categoria: "documentos", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 300 },
  { chave: "rg_numero", rotulo: "Nº RG", categoria: "documentos", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 310 },
  { chave: "rg_orgao_emissor", rotulo: "Órgão Emissor RG", categoria: "documentos", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 320 },
  { chave: "rg_estado_emissor", rotulo: "Estado Emissor RG", categoria: "documentos", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 330 },
  { chave: "rg_data_emissao", rotulo: "Data de Emissão RG", categoria: "documentos", tipo: "data", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 340 },
  { chave: "rg_data_validade", rotulo: "Data de Validade RG", categoria: "documentos", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 350 },
  { chave: "foto_rg", rotulo: "Foto do RG / Documento", categoria: "documentos", tipo: "texto", opcoes: null, permite_foto: true, obrigatorio: false, ordem: 360 },

  // Passaporte & Viagens
  { chave: "passaporte_nome", rotulo: "Nome Conforme Passaporte", categoria: "passaporte_viagem", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 400 },
  { chave: "passaporte_sobrenome", rotulo: "Sobrenome Conforme Passaporte", categoria: "passaporte_viagem", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 410 },
  { chave: "passaporte_numero", rotulo: "Nº Passaporte", categoria: "passaporte_viagem", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 420 },
  { chave: "passaporte_emissao", rotulo: "Emissão Passaporte", categoria: "passaporte_viagem", tipo: "data", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 430 },
  { chave: "passaporte_validade", rotulo: "Validade Passaporte", categoria: "passaporte_viagem", tipo: "data", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 440 },
  { chave: "visto_usa_validade", rotulo: "Validade Visto USA / Ñ tenho", categoria: "passaporte_viagem", tipo: "texto", opcoes: null, permite_foto: false, obrigatorio: false, ordem: 450 },
  { chave: "foto_passaporte", rotulo: "Foto do Passaporte", categoria: "passaporte_viagem", tipo: "texto", opcoes: null, permite_foto: true, obrigatorio: false, ordem: 460 },
  { chave: "foto_visto", rotulo: "Foto do Visto USA", categoria: "passaporte_viagem", tipo: "texto", opcoes: null, permite_foto: true, obrigatorio: false, ordem: 470 },

  // Uniformes & Tamanhos
  { chave: "agasalho", rotulo: "Agasalho", categoria: "uniformes", tipo: "selecao", opcoes: TAMANHOS_VESTUARIO, permite_foto: false, obrigatorio: false, ordem: 500 },
  { chave: "bermuda_social", rotulo: "Bermuda Social", categoria: "uniformes", tipo: "selecao", opcoes: TAMANHOS_VESTUARIO, permite_foto: false, obrigatorio: false, ordem: 510 },
  { chave: "calca", rotulo: "Calça", categoria: "uniformes", tipo: "selecao", opcoes: TAMANHOS_VESTUARIO, permite_foto: false, obrigatorio: false, ordem: 520 },
  { chave: "calca_social", rotulo: "Calça Social", categoria: "uniformes", tipo: "selecao", opcoes: TAMANHOS_VESTUARIO, permite_foto: false, obrigatorio: false, ordem: 530 },
  { chave: "camisa", rotulo: "Camisa", categoria: "uniformes", tipo: "selecao", opcoes: TAMANHOS_VESTUARIO, permite_foto: false, obrigatorio: false, ordem: 540 },
  { chave: "camisa_termica", rotulo: "Camisa Térmica", categoria: "uniformes", tipo: "selecao", opcoes: TAMANHOS_VESTUARIO, permite_foto: false, obrigatorio: false, ordem: 550 },
  { chave: "camisa_polo", rotulo: "Camisa Polo", categoria: "uniformes", tipo: "selecao", opcoes: TAMANHOS_VESTUARIO, permite_foto: false, obrigatorio: false, ordem: 560 },
  { chave: "camisa_regata", rotulo: "Camisa Regata", categoria: "uniformes", tipo: "selecao", opcoes: TAMANHOS_VESTUARIO, permite_foto: false, obrigatorio: false, ordem: 570 },
  { chave: "capa_chuva", rotulo: "Capa de Chuva", categoria: "uniformes", tipo: "selecao", opcoes: TAMANHOS_VESTUARIO, permite_foto: false, obrigatorio: false, ordem: 580 },
  { chave: "chinelo", rotulo: "Chinelo", categoria: "uniformes", tipo: "selecao", opcoes: TAMANHOS_CALCADO, permite_foto: false, obrigatorio: false, ordem: 590 },
  { chave: "jaqueta", rotulo: "Jaqueta", categoria: "uniformes", tipo: "selecao", opcoes: TAMANHOS_VESTUARIO, permite_foto: false, obrigatorio: false, ordem: 600 },
  { chave: "legging_termica", rotulo: "Legging Térmica", categoria: "uniformes", tipo: "selecao", opcoes: TAMANHOS_VESTUARIO, permite_foto: false, obrigatorio: false, ordem: 610 },
  { chave: "meias", rotulo: "Meias", categoria: "uniformes", tipo: "selecao", opcoes: TAMANHOS_MEIAS, permite_foto: false, obrigatorio: false, ordem: 620 },
  { chave: "short", rotulo: "Short", categoria: "uniformes", tipo: "selecao", opcoes: TAMANHOS_VESTUARIO, permite_foto: false, obrigatorio: false, ordem: 630 },
  { chave: "short_termico", rotulo: "Short Térmico", categoria: "uniformes", tipo: "selecao", opcoes: TAMANHOS_VESTUARIO, permite_foto: false, obrigatorio: false, ordem: 640 },
  { chave: "sunga", rotulo: "Sunga", categoria: "uniformes", tipo: "selecao", opcoes: TAMANHOS_VESTUARIO, permite_foto: false, obrigatorio: false, ordem: 650 },
  { chave: "tenis", rotulo: "Tênis", categoria: "uniformes", tipo: "selecao", opcoes: TAMANHOS_CALCADO, permite_foto: false, obrigatorio: false, ordem: 660 },
];

/**
 * Converte data de número de série do Excel (ex: 31410.0 ou 45839.0) ou string para ISO YYYY-MM-DD
 */
export function formatarDataExcel(valor: any): string {
  if (!valor) return "";
  const str = String(valor).trim();
  if (!str || str === "01/01/0001" || str.toLowerCase() === "indeterminado") return "";

  // Se já for YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // Se for DD/MM/YYYY
  const partesBr = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (partesBr) {
    const [, d, m, y] = partesBr;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Se for número serial do Excel (ex: 31410 ou 31410.0)
  const num = parseFloat(str);
  if (!isNaN(num) && num > 1000 && num < 100000) {
    // Excel base date: 1899-12-30 (accounting for Excel leap year bug in 1900)
    const base = new Date(Date.UTC(1899, 11, 30));
    const dataObj = new Date(base.getTime() + Math.round(num) * 86400000);
    if (!isNaN(dataObj.getTime())) {
      return dataObj.toISOString().slice(0, 10);
    }
  }

  return str;
}

/**
 * Carrega a lista de campos cadastrais do clube.
 * Se a tabela estiver vazia para o clube, insere automaticamente os campos padrão.
 */
export async function carregarCamposCadastro(supabase: SupabaseClient, clubeId: string): Promise<CampoCadastro[]> {
  const { data, error } = await supabase
    .from("campos_cadastro_atleta")
    .select("*")
    .eq("clube_id", clubeId)
    .order("ordem", { ascending: true });

  if (error) {
    console.warn("Erro ao carregar campos cadastrais (tabela pode estar pendente de migração):", error.message);
    return CAMPOS_PADRAO_INICIAIS.map((c, i) => ({
      ...c,
      id: `padrao-${i}`,
      clube_id: clubeId,
    }));
  }

  if (!data || data.length === 0) {
    // Semeia os campos padrão no banco
    const paraInserir = CAMPOS_PADRAO_INICIAIS.map((c) => ({
      ...c,
      clube_id: clubeId,
    }));
    const { data: inseridos } = await supabase
      .from("campos_cadastro_atleta")
      .insert(paraInserir)
      .select("*")
      .order("ordem", { ascending: true });

    return (inseridos ?? paraInserir) as CampoCadastro[];
  }

  return data as CampoCadastro[];
}

/**
 * Carrega o registro cadastral de um atleta específico
 */
export async function carregarDadosAtleta(
  supabase: SupabaseClient,
  clubeId: string,
  atletaId: string
): Promise<RegistroCadastral | null> {
  const { data, error } = await supabase
    .from("dados_cadastrais_atleta")
    .select("*, atleta:usuarios!atleta_id(id, nome, papel, ativo, posicao, ano_nascimento)")
    .eq("clube_id", clubeId)
    .eq("atleta_id", atletaId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Erro ao carregar dados do atleta:", error.message);
  }

  return data as RegistroCadastral | null;
}

/**
 * Carrega todos os registros cadastrais dos atletas do clube (apenas para comissão técnica e gestores)
 */
export async function carregarTodosDadosAtletas(
  supabase: SupabaseClient,
  clubeId: string
): Promise<{ atletas: any[]; cadastros: Record<string, RegistroCadastral> }> {
  const [resAtletas, resCadastros] = await Promise.all([
    supabase
      .from("usuarios")
      .select("id, nome, papel, ativo, posicao, ano_nascimento, membros_equipa(numero_camisa, equipas(nome))")
      .eq("clube_id", clubeId)
      .order("nome", { ascending: true }),
    supabase
      .from("dados_cadastrais_atleta")
      .select("*")
      .eq("clube_id", clubeId),
  ]);

  const atletas = resAtletas.data ?? [];
  const cadastrosMap: Record<string, RegistroCadastral> = {};
  (resCadastros.data ?? []).forEach((c: any) => {
    cadastrosMap[c.atleta_id] = c as RegistroCadastral;
  });

  return { atletas, cadastros: cadastrosMap };
}

/**
 * Mapeamento das colunas da planilha Excel para as chaves internas
 */
export const MAPA_COLUNAS_EXCEL: Record<string, string> = {
  "CHECADO?": "checado",
  "Tipo": "tipo_cadastro",
  "Nome": "nome_completo",
  "Data de Nascimento": "data_nascimento",
  "Altura": "altura",
  "Peso": "peso",
  "Nome Conforme Passaporte": "passaporte_nome",
  "Sobrenome Conforme Passaporte": "passaporte_sobrenome",
  "Nome Preferido": "nome_preferido",
  "Sobrenome Preferido": "sobrenome_preferido",
  "Nome do Pai": "nome_pai",
  "Nome da Mãe": "nome_mae",
  "Função": "funcao",
  "E-mail": "email",
  "Nacionalidade": "nacionalidade",
  "Naturalidade Pais": "naturalidade_pais",
  "Naturalidade Estado": "naturalidade_estado",
  "Naturalidade Cidade": "naturalidade_cidade",
  "Endereço": "endereco",
  "Cidade": "cidade",
  "Estado": "estado",
  "País": "pais",
  "CPF": "cpf",
  "Nº RG": "rg_numero",
  "Órgão Emissor RG": "rg_orgao_emissor",
  "Estado Emissor RG": "rg_estado_emissor",
  "Data de Emissão RG": "rg_data_emissao",
  "Data de Validade RG": "rg_data_validade",
  "Nº Passaporte": "passaporte_numero",
  "Emissão Passaporte": "passaporte_emissao",
  "Validade Passaporte": "passaporte_validade",
  "Validade Visto USA/ Ñ tenho": "visto_usa_validade",
  "Contato": "contato",
  "Agasalho": "agasalho",
  "Bermuda Social": "bermuda_social",
  "Calça": "calca",
  "Calça Social": "calca_social",
  "Camisa": "camisa",
  "Camisa Térmica": "camisa_termica",
  "Camisa Polo": "camisa_polo",
  "Camisa Regata": "camisa_regata",
  "Capa de Chuva": "capa_chuva",
  "Chinelo": "chinelo",
  "Jaqueta": "jaqueta",
  "Legging Térmica": "legging_termica",
  "Meias": "meias",
  "Short": "short",
  "Short Térmico": "short_termico",
  "Sunga": "sunga",
  "Tênis": "tenis",
};
