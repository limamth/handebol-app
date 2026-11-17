import type { Papel } from "@/types";

export type Modulo = "equipas" | "calendario" | "biblioteca" | "prancheta" | "monitorizacao" | "avaliacoes" | "estatisticas" | "utilizadores" | "musculacao" | "bemestar" | "dores" | "shootout" | "backup";
type Nivel = "nenhum" | "ver" | "editar";

// Matriz papel x módulo. A fonte de verdade da segurança é o RLS no banco; isto só controla a interface.
export const PERMISSOES: Record<Papel, Record<Modulo, Nivel>> = {
  gestor:           { equipas: "editar", calendario: "editar", biblioteca: "editar", prancheta: "editar", monitorizacao: "editar", avaliacoes: "editar", estatisticas: "editar", utilizadores: "editar", musculacao: "editar" , bemestar: "nenhum" , dores: "editar" , shootout: "editar" , backup: "editar" },
  diretor:          { equipas: "ver",    calendario: "ver",    biblioteca: "ver",    prancheta: "ver",    monitorizacao: "ver",    avaliacoes: "ver",    estatisticas: "ver",    utilizadores: "ver",    musculacao: "ver" , bemestar: "nenhum" , dores: "ver" , shootout: "ver" , backup: "nenhum" },
  comissao_tecnica: { equipas: "editar", calendario: "editar", biblioteca: "editar", prancheta: "editar", monitorizacao: "editar", avaliacoes: "editar", estatisticas: "editar", utilizadores: "nenhum", musculacao: "editar" , bemestar: "nenhum" , dores: "editar" , shootout: "editar" , backup: "nenhum" },
  // Na musculação o atleta registra os próprios dias (o banco impede que mexa nos dos colegas).
  atleta:           { equipas: "nenhum", calendario: "ver",    biblioteca: "nenhum",    prancheta: "ver",    monitorizacao: "nenhum", avaliacoes: "nenhum", estatisticas: "nenhum", utilizadores: "nenhum", musculacao: "editar" , bemestar: "editar" , dores: "nenhum" , shootout: "ver" , backup: "nenhum" },
};

export const podeVer = (p: Papel, m: Modulo) => PERMISSOES[p][m] !== "nenhum";
export const podeEditar = (p: Papel, m: Modulo) => PERMISSOES[p][m] === "editar";
