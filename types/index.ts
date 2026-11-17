export type Papel = "gestor" | "diretor" | "comissao_tecnica" | "atleta";
export type TipoSessao = "treino" | "jogo" | "teste" | "recuperacao";
export type ObjetivoExercicio = "tecnico" | "tatico" | "fisico" | "goleiro";

export interface Atleta { id: string; nome: string; posicao: string; equipaId: string; }
export interface Sessao { id: string; titulo: string; tipo: TipoSessao; inicio: string; duracaoMin: number; equipaId: string; }
