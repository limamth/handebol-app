import type { SupabaseClient } from "@supabase/supabase-js";

// Na ordem em que precisam ser restauradas (as tabelas "pai" vêm antes). Não inclui os códigos de acesso.
export const TABELAS_BACKUP = [
  "clubes", "usuarios", "configuracoes_modulos", "configuracao_lembretes", "campos_cadastro_atleta", "dados_cadastrais_atleta", "equipas", "membros_equipa", "diagramas", "exercicios", "sessoes", "sessao_exercicios", "presencas",
  "definicoes_teste", "resultados_teste", "questionarios", "respostas_questionario", "fases_treinamento", "fase_convocados",
  "rpe_sessao", "sessoes_forca", "shootout_goleiros", "shootout_sessoes", "shootout_batidas",
  "equipes_adversarias", "atletas_adversarios", "scout_finalizacoes_adversario",
  "equipes_analise", "atletas_equipe_analise", "partidas_analise", "acoes_partida",
  "projetos_video", "tags_video", "playlists_video",
  "apresentacoes", "apresentacao_slides",
  "push_subscriptions", "notificacoes_historico",
];

// Ordem usada na leitura em páginas (precisa ser estável). A maioria das tabelas tem "id".
const ORDEM: Record<string, string[]> = {
  membros_equipa: ["equipa_id", "usuario_id"], sessao_exercicios: ["sessao_id", "ordem"], presencas: ["sessao_id", "atleta_id"],
  fase_convocados: ["fase_id", "atleta_id"], shootout_goleiros: ["atleta_id"], configuracoes_modulos: ["clube_id", "modulo"],
  configuracao_lembretes: ["clube_id"], push_subscriptions: ["usuario_id", "endpoint"],
  campos_cadastro_atleta: ["clube_id", "ordem"], dados_cadastrais_atleta: ["clube_id", "atleta_id"],
};

// O banco devolve no máximo 1000 linhas por consulta, então lemos em páginas
async function lerTabela(supabase: SupabaseClient, tabela: string) {
  const linhas: any[] = [];
  const colunas = ORDEM[tabela] ?? ["id"];
  for (let de = 0; de < 200000; de += 1000) {
    let q: any = supabase.from(tabela).select("*").range(de, de + 999);
    for (const c of colunas) q = q.order(c);
    const { data, error } = await q;
    if (error) throw new Error(`${tabela}: ${error.message}`);
    linhas.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return linhas;
}

export async function gerarBackup(supabase: SupabaseClient) {
  const tabelas: Record<string, any[]> = {};
  const contagens: Record<string, number> = {};
  for (const t of TABELAS_BACKUP) {
    tabelas[t] = await lerTabela(supabase, t);
    contagens[t] = tabelas[t].length;
  }
  const total = Object.values(contagens).reduce((a, b) => a + b, 0);
  const arquivo = { formato: "handebol-hub-backup", versao: 1, gerado_em: new Date().toISOString(), contagens, tabelas };
  return { conteudo: JSON.stringify(arquivo), total };
}
