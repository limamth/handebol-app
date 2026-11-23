import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Modulo } from "./permissions";

// Funções que o gestor e a comissão técnica podem ativar ou desativar. Equipas, Utilizadores, Backup e Configurações
// ficam sempre ativas.
export const MODULOS_CONFIGURAVEIS: { chave: Modulo; rotulo: string; descricao: string }[] = [
  { chave: "calendario", rotulo: "Calendário", descricao: "Sessões de treino e jogo, com presença e exercícios de cada sessão. O atleta registra o RPE dentro da sessão (isso também depende da Monitorização)." },
  { chave: "biblioteca", rotulo: "Exercícios", descricao: "Biblioteca de exercícios usada para montar as sessões." },
  { chave: "prancheta", rotulo: "Prancheta", descricao: "Jogadas e esquemas táticos." },
  { chave: "monitorizacao", rotulo: "Monitorização", descricao: "Acompanhamento diário dos atletas, carga de treino (RPE) e as fases de treinamento com a convocação dos atletas." },
  { chave: "bemestar", rotulo: "Meu bem-estar (atletas)", descricao: "Questionário que os atletas respondem nas fases de treinamento. As fases e a convocação ficam na Monitorização." },
  { chave: "dores", rotulo: "Dores", descricao: "Painel de dores para a fisioterapia." },
  { chave: "avaliacoes", rotulo: "Avaliações físicas", descricao: "Testes físicos e resultados dos atletas." },
  { chave: "estatisticas", rotulo: "Estatísticas", descricao: "Estatísticas de treino e presença, relatório para imprimir e exportação em CSV." },
  { chave: "musculacao", rotulo: "Musculação", descricao: "Registro dos treinos de musculação pelos atletas e o acompanhamento do grupo." },
  { chave: "shootout", rotulo: "Shoot-out", descricao: "Registro das batidas, rankings e comparação entre fases." },
];

export const rotuloDoModulo = (chave: string) => MODULOS_CONFIGURAVEIS.find((m) => m.chave === chave)?.rotulo ?? chave;

// Chaves das funções desativadas. Se a tabela ainda não existe (SQL não rodado), tudo fica ativo.
export async function carregarDesativados(): Promise<string[]> {
  const supabase = criarClienteServidor();
  const { data, error } = await supabase.from("configuracoes_modulos").select("modulo, ativo");
  if (error) return [];
  return ((data ?? []) as { modulo: string; ativo: boolean }[]).filter((r) => r.ativo === false).map((r) => r.modulo);
}

// Usado pelo layout de cada função: se estiver desativada, ninguém entra
export async function exigirModuloAtivo(modulo: Modulo) {
  const desativados = await carregarDesativados();
  if (desativados.includes(modulo)) redirect(`/desativado?m=${modulo}`);
}
