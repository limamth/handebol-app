import type { Papel } from "@/types";

export type Modulo = "equipas" | "calendario" | "biblioteca" | "prancheta" | "monitorizacao" | "avaliacoes" | "estatisticas" | "utilizadores" | "musculacao" | "bemestar" | "dores" | "shootout" | "backup" | "configuracoes" | "scout" | "dados" | "analise_jogo" | "video" | "apresentacoes";
type Nivel = "nenhum" | "ver" | "editar";

// Matriz papel x módulo. A fonte de verdade da segurança é o RLS no banco; isto só controla a interface.
export const PERMISSOES: Record<Papel, Record<Modulo, Nivel>> = {
  gestor:           { equipas: "editar", calendario: "editar", biblioteca: "editar", prancheta: "editar", monitorizacao: "editar", avaliacoes: "editar", estatisticas: "editar", utilizadores: "editar", musculacao: "editar" , bemestar: "nenhum" , dores: "editar" , shootout: "editar" , backup: "editar" , configuracoes: "editar", scout: "editar", dados: "editar", analise_jogo: "editar", video: "editar", apresentacoes: "editar" },
  diretor:          { equipas: "ver",    calendario: "ver",    biblioteca: "ver",    prancheta: "ver",    monitorizacao: "ver",    avaliacoes: "ver",    estatisticas: "ver",    utilizadores: "ver",    musculacao: "ver" , bemestar: "nenhum" , dores: "ver" , shootout: "ver" , backup: "nenhum" , configuracoes: "ver", scout: "ver", dados: "ver", analise_jogo: "ver", video: "ver", apresentacoes: "ver" },
  comissao_tecnica: { equipas: "editar", calendario: "editar", biblioteca: "editar", prancheta: "editar", monitorizacao: "editar", avaliacoes: "editar", estatisticas: "editar", utilizadores: "nenhum", musculacao: "editar" , bemestar: "nenhum" , dores: "editar" , shootout: "editar" , backup: "nenhum" , configuracoes: "editar", scout: "editar", dados: "editar", analise_jogo: "editar", video: "editar", apresentacoes: "editar" },
  // Na musculação e dados o atleta edita os próprios registros (o banco impede que veja ou mexa nos dos colegas).
  atleta:           { equipas: "nenhum", calendario: "ver",    biblioteca: "ver",       prancheta: "ver",    monitorizacao: "nenhum", avaliacoes: "nenhum", estatisticas: "nenhum", utilizadores: "nenhum", musculacao: "editar" , bemestar: "editar" , dores: "nenhum" , shootout: "ver" , backup: "nenhum" , configuracoes: "nenhum", scout: "ver", dados: "editar", analise_jogo: "nenhum", video: "nenhum", apresentacoes: "ver" },
};

export const podeVer = (p: Papel, m: Modulo) => PERMISSOES[p][m] !== "nenhum";
export const podeEditar = (p: Papel, m: Modulo) => PERMISSOES[p][m] === "editar";
