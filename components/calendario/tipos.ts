export const ROTULO_TIPO: Record<string, string> = { treino: "Treino", jogo: "Jogo", teste: "Teste", recuperacao: "Recuperação" };

// Classes escritas por extenso para o Tailwind encontrá-las
export const COR_TIPO: Record<string, string> = {
  treino: "bg-quadra-600 text-white",
  jogo: "bg-bola-500 text-white",
  teste: "bg-emerald-700 text-white",
  recuperacao: "bg-slate-500 text-white",
};

export const ROTULO_PRESENCA: Record<string, string> = {
  presente: "Presente", falta_doenca: "Falta (doença)", falta_lesao: "Falta (lesão)", falta_outro: "Falta (outro motivo)",
};
