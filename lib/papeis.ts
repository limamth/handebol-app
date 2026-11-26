import type { Papel } from "@/types";

export const ROTULO_PAPEL: Record<Papel, string> = {
  gestor: "Gestor", diretor: "Diretor", comissao_tecnica: "Comissão técnica", atleta: "Atleta",
};

// Perfis que podem ser cadastrados na aba de gestão (atletas têm cadastro próprio, em Equipas)
export const PAPEIS_CADASTRAVEIS: Papel[] = ["gestor", "diretor", "comissao_tecnica"];

export const DESCRICAO_PAPEL: Record<Papel, string> = {
  gestor: "Edita tudo, inclusive utilizadores: cadastra, altera e exclui usuários e gera códigos de acesso.",
  diretor: "Vê todas as áreas do app, sem editar nada.",
  comissao_tecnica: "Edita tudo, exceto utilizadores: equipas, calendário, exercícios, prancheta, carga, bem-estar, testes e estatísticas.",
  atleta: "Vê o calendário, os exercícios de cada sessão e a prancheta e registra os próprios treinos de musculação. Quando convocado para uma fase de treinamento, registra também o RPE das sessões e o próprio bem-estar.",
};

export const ROTULO_MODULO = {
  equipas: "Equipas", calendario: "Calendário", biblioteca: "Exercícios", prancheta: "Prancheta",
  monitorizacao: "Monitorização", avaliacoes: "Avaliações", estatisticas: "Estatísticas",
  utilizadores: "Utilizadores", musculacao: "Musculação", bemestar: "Meu bem-estar", dores: "Dores", shootout: "Shoot-out", scout: "Scout", analise_jogo: "Análise ao Vivo", video: "Vídeo & Tagging", apresentacoes: "Apresentações", dados: "Dados", backup: "Backup", configuracoes: "Configurações",
} as const;
