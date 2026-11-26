export type ResultadoAcao = "gol" | "fora" | "defendido" | "turnover" | "acao_defensiva";
export type TipoArremessoAnalise = "giro" | "aerea" | "6m" | "especialista" | "1pt";
export type TipoTurnover = "andada" | "dois_dribles" | "troca" | "invasao" | "passe" | "recepcao";
export type TipoAcaoDefensiva = "roubo" | "falta_ataque" | "desvio" | "block";
export type ZonaAtaque =
  | "lat_esq"
  | "meio_esq"
  | "meio_dir"
  | "lat_dir"
  | "9m"
  | "direto"
  | "contra_ataque"
  | "nao_aplica";
export type FaixaTempo = "0~2" | "2~4" | "4~6" | "6~8" | "8~10";

export const FASES_PARTIDA = ["Grupos", "Main Round", "Quartas", "Semi", "Final", "Amistoso", "Treino"] as const;
export const FAIXAS_TEMPO: FaixaTempo[] = ["0~2", "2~4", "4~6", "6~8", "8~10"];

export const RESULTADOS_ACAO: { chave: ResultadoAcao; rotulo: string; icone: string; cor: string }[] = [
  { chave: "gol", rotulo: "GOL", icone: "⚽", cor: "bg-emerald-600 text-white hover:bg-emerald-700" },
  { chave: "fora", rotulo: "FORA", icone: "❌", cor: "bg-rose-600 text-white hover:bg-rose-700" },
  { chave: "defendido", rotulo: "DEFENDIDO", icone: "🧤", cor: "bg-amber-500 text-white hover:bg-amber-600" },
  { chave: "turnover", rotulo: "TURNOVER", icone: "🔄", cor: "bg-purple-600 text-white hover:bg-purple-700" },
  { chave: "acao_defensiva", rotulo: "AÇÃO DEFENSIVA", icone: "🛡️", cor: "bg-quadra-700 text-white hover:bg-quadra-800" },
];

export const TIPOS_ARREMESSO_ANALISE: { chave: TipoArremessoAnalise; rotulo: string; pontos: number }[] = [
  { chave: "giro", rotulo: "GIRO", pontos: 2 },
  { chave: "aerea", rotulo: "AÉREA", pontos: 2 },
  { chave: "6m", rotulo: "6M", pontos: 2 },
  { chave: "especialista", rotulo: "ESPEC.", pontos: 2 },
  { chave: "1pt", rotulo: "1PT", pontos: 1 },
];

export const TIPOS_TURNOVER: { chave: TipoTurnover; rotulo: string }[] = [
  { chave: "andada", rotulo: "ANDADA" },
  { chave: "dois_dribles", rotulo: "DOIS DRIBLES" },
  { chave: "troca", rotulo: "TROCA" },
  { chave: "invasao", rotulo: "INVASÃO" },
  { chave: "passe", rotulo: "PASSE" },
  { chave: "recepcao", rotulo: "RECEPÇÃO" },
];

export const TIPOS_ACAO_DEFENSIVA: { chave: TipoAcaoDefensiva; rotulo: string }[] = [
  { chave: "roubo", rotulo: "ROUBO" },
  { chave: "falta_ataque", rotulo: "FALTA DE ATAQUE" },
  { chave: "desvio", rotulo: "DESVIO" },
  { chave: "block", rotulo: "BLOCK" },
];

export const ZONAS_ATAQUE: { chave: ZonaAtaque; rotulo: string; curto: string }[] = [
  { chave: "lat_esq", rotulo: "Lateral Esquerda", curto: "LAT. ESQ" },
  { chave: "meio_esq", rotulo: "Meio Esquerda", curto: "MEIO ESQ" },
  { chave: "meio_dir", rotulo: "Meio Direita", curto: "MEIO DIR" },
  { chave: "lat_dir", rotulo: "Lateral Direita", curto: "LAT. DIR" },
  { chave: "9m", rotulo: "9 Metros", curto: "9M" },
  { chave: "direto", rotulo: "Direto", curto: "DIRETO" },
  { chave: "contra_ataque", rotulo: "⚡ Contra-Ataque", curto: "⚡ CONTRA-ATAQUE" },
  { chave: "nao_aplica", rotulo: "Não se aplica", curto: "NÃO SE APLICA" },
];

export const ROTULO_TIPO: Record<string, string> = {
  giro: "Giro",
  aerea: "Aérea",
  "6m": "6m",
  especialista: "Especialista",
  "1pt": "1pt",
  andada: "Andada",
  dois_dribles: "Dois Dribles",
  troca: "Troca",
  invasao: "Invasão",
  passe: "Passe",
  recepcao: "Recepção",
  roubo: "Roubo",
  falta_ataque: "Falta de Ataque",
  desvio: "Desvio",
  block: "Block",
};

export const ROTULO_RESULTADO: Record<ResultadoAcao, string> = {
  gol: "Gol",
  fora: "Fora",
  defendido: "Defendido",
  turnover: "Turnover",
  acao_defensiva: "Ação Def.",
};

export const ROTULO_ZONA: Record<string, string> = Object.fromEntries(
  ZONAS_ATAQUE.map((z) => [z.chave, z.rotulo])
);

export function pontosDoArremesso(tipo: string): number {
  if (tipo === "1pt") return 1;
  if (["giro", "aerea", "6m", "especialista"].includes(tipo)) return 2;
  return 0;
}

export interface EquipeAnalise {
  id: string;
  clube_id: string;
  nome: string;
  categoria?: string | null;
  tipo: "nossa" | "terceira";
  equipe_adversaria_id?: string | null;
  criado_em: string;
  atletas_equipe_analise?: AtletaEquipeAnalise[];
}

export interface AtletaEquipeAnalise {
  id: string;
  clube_id: string;
  equipe_analise_id: string;
  nome: string;
  numero?: number | null;
  posicao?: string | null;
  atleta_adversario_id?: string | null;
}

export interface PartidaAnalise {
  id: string;
  clube_id: string;
  equipa_id?: string | null;
  equipe_adversaria_id?: string | null;
  equipe_a_id?: string | null;
  equipe_a_nome?: string | null;
  equipe_b_id?: string | null;
  equipe_b_nome?: string | null;
  adversario_nome: string;
  competicao?: string | null;
  fase?: string | null;
  data_partida: string;
  status: "ao_vivo" | "finalizada";
  set1_nos: number;
  set1_adv: number;
  set2_nos: number;
  set2_adv: number;
  shootout_nos: number;
  shootout_adv: number;
  criado_em: string;
  equipas?: { id: string; nome: string; categoria?: string | null } | null;
}

export function obterNomeEquipeA(p: Pick<PartidaAnalise, "equipe_a_nome" | "equipas">): string {
  return p.equipe_a_nome || p.equipas?.nome || "Equipe A";
}

export function obterNomeEquipeB(p: Pick<PartidaAnalise, "equipe_b_nome" | "adversario_nome">): string {
  return p.equipe_b_nome || p.adversario_nome || "Equipe B";
}

export interface AcaoPartida {
  id: string;
  clube_id: string;
  partida_id: string;
  set_numero: number; // 1, 2, 3 (shootout)
  lado: "nos" | "adversario";
  resultado: ResultadoAcao;
  atleta_id?: string | null;
  atleta_adversario_id?: string | null;
  atleta_nome: string;
  tipo: string;
  pontos: number;
  atleta_alvo_id?: string | null;
  atleta_alvo_nome?: string | null;
  zona?: string | null;
  quadrante_baliza?: string | null;
  scout_finalizacao_id?: string | null;
  faixa_tempo: string;
  placar_nos_momento: number;
  placar_adv_momento: number;
  criado_em: string;
}

export function calcularPlacaresPorSet(acoes: AcaoPartida[]) {
  let set1_nos = 0, set1_adv = 0;
  let set2_nos = 0, set2_adv = 0;
  let shootout_nos = 0, shootout_adv = 0;

  for (const a of acoes) {
    if (a.resultado !== "gol") continue;
    const pts = a.pontos || pontosDoArremesso(a.tipo) || 1;
    if (a.set_numero === 1) {
      if (a.lado === "nos") set1_nos += pts;
      else set1_adv += pts;
    } else if (a.set_numero === 2) {
      if (a.lado === "nos") set2_nos += pts;
      else set2_adv += pts;
    } else if (a.set_numero === 3) {
      if (a.lado === "nos") shootout_nos += pts;
      else shootout_adv += pts;
    }
  }

  return { set1_nos, set1_adv, set2_nos, set2_adv, shootout_nos, shootout_adv };
}

export function calcularSetsVencidos(p: Pick<PartidaAnalise, "set1_nos" | "set1_adv" | "set2_nos" | "set2_adv" | "shootout_nos" | "shootout_adv">) {
  let nos = 0;
  let adv = 0;
  if (p.set1_nos > p.set1_adv) nos++;
  else if (p.set1_adv > p.set1_nos) adv++;

  if (p.set2_nos > p.set2_adv) nos++;
  else if (p.set2_adv > p.set2_nos) adv++;

  if (nos === 1 && adv === 1) {
    if (p.shootout_nos > p.shootout_adv) nos++;
    else if (p.shootout_adv > p.shootout_nos) adv++;
  }
  return { nos, adv };
}

export interface ResumoEquipeStats {
  pontos: number;
  golsQtd: number;
  arremessosQtd: number;
  turnoversQtd: number;
  possesQtd: number;
  pctArremessos: number;
  pctGeral: number;
  porTipo: { tipo: string; rotulo: string; gols: number; arremessos: number; pontos: number; pct: number }[];
  porZona: { zona: string; rotulo: string; gols: number; arremessos: number; pontos: number; pct: number }[];
}

export interface AtletaStatsLinha {
  nome: string;
  lado: "nos" | "adversario";
  golsQtd: number;
  pontos: number;
  arremessosQtd: number;
  pctArremesso: number;
  bloqueadoSofrido: number;
  turnovers: number;
  rouboSofrido: number;
  blockDef: number;
  faltaAtaqueDef: number;
  rouboDef: number;
  desvioDef: number;
  porTipo: Record<string, { gols: number; arr: number }>;
}

export function calcularEstatisticasLado(
  acoes: AcaoPartida[],
  lado: "nos" | "adversario"
): ResumoEquipeStats {
  // Cada ação tem `lado` = equipe com a posse de bola no lance
  const acoesNaPosse = acoes.filter((a) => a.lado === lado);

  const finalizacoesProprias = acoesNaPosse.filter((a) => ["gol", "fora", "defendido"].includes(a.resultado));
  const gols = finalizacoesProprias.filter((a) => a.resultado === "gol");
  const turnoversProprios = acoesNaPosse.filter((a) => a.resultado === "turnover");
  const acoesDefensivasSofridas = acoesNaPosse.filter((a) => a.resultado === "acao_defensiva");

  const blocksSofridos = acoesDefensivasSofridas.filter((a) => a.tipo === "block");
  const roubosSofridos = acoesDefensivasSofridas.filter((a) => a.tipo === "roubo");
  const faltasAtaqueSofridas = acoesDefensivasSofridas.filter((a) => a.tipo === "falta_ataque");
  const desviosSofridos = acoesDefensivasSofridas.filter((a) => a.tipo === "desvio");

  const pontos = gols.reduce((acc, a) => acc + (a.pontos || pontosDoArremesso(a.tipo)), 0);
  const golsQtd = gols.length;
  // Block sofrido conta como arremesso bloqueado
  const arremessosQtd = finalizacoesProprias.length + blocksSofridos.length;
  // Turnovers incluem turnovers diretos + roubos sofridos + faltas de ataque sofridas
  const turnoversQtd = turnoversProprios.length + roubosSofridos.length + faltasAtaqueSofridas.length;
  // Toda posse encerrada com ação defensiva (incl. desvio) conta como posse sem gol no aproveitamento geral
  const possesQtd = arremessosQtd + turnoversQtd + desviosSofridos.length;

  const pctArremessos = arremessosQtd > 0 ? Math.round((golsQtd / arremessosQtd) * 100) : 0;
  const pctGeral = possesQtd > 0 ? Math.round((golsQtd / possesQtd) * 100) : 0;

  // Por tipo de arremesso
  const porTipo = TIPOS_ARREMESSO_ANALISE.map((t) => {
    const arrTipo = finalizacoesProprias.filter((a) => a.tipo === t.chave);
    const golsTipo = arrTipo.filter((a) => a.resultado === "gol");
    const arrCount = arrTipo.length;
    const golsCount = golsTipo.length;
    const ptsTipo = golsTipo.reduce((acc, a) => acc + (a.pontos || t.pontos), 0);
    return {
      tipo: t.chave,
      rotulo: t.rotulo,
      gols: golsCount,
      arremessos: arrCount,
      pontos: ptsTipo,
      pct: arrCount > 0 ? Math.round((golsCount / arrCount) * 100) : 0,
    };
  }).sort((a, b) => b.pct - a.pct || b.gols - a.gols);

  // Por zona
  const porZona = ZONAS_ATAQUE.filter((z) => z.chave !== "nao_aplica").map((z) => {
    const arrZona = finalizacoesProprias.filter((a) => a.zona === z.chave);
    const blocksZona = blocksSofridos.filter((a) => a.zona === z.chave);
    const golsZona = arrZona.filter((a) => a.resultado === "gol");
    const arrCount = arrZona.length + blocksZona.length;
    const golsCount = golsZona.length;
    const ptsZona = golsZona.reduce((acc, a) => acc + (a.pontos || pontosDoArremesso(a.tipo)), 0);
    return {
      zona: z.chave,
      rotulo: z.rotulo,
      gols: golsCount,
      arremessos: arrCount,
      pontos: ptsZona,
      pct: arrCount > 0 ? Math.round((golsCount / arrCount) * 100) : 0,
    };
  });

  return {
    pontos,
    golsQtd,
    arremessosQtd,
    turnoversQtd,
    possesQtd,
    pctArremessos,
    pctGeral,
    porTipo,
    porZona,
  };
}

export function calcularEstatisticasAtletas(acoes: AcaoPartida[]): AtletaStatsLinha[] {
  const mapa = new Map<string, AtletaStatsLinha>();

  const garantir = (nome: string, lado: "nos" | "adversario"): AtletaStatsLinha => {
    const key = `${lado}::${nome}`;
    let item = mapa.get(key);
    if (!item) {
      item = {
        nome,
        lado,
        golsQtd: 0,
        pontos: 0,
        arremessosQtd: 0,
        pctArremesso: 0,
        bloqueadoSofrido: 0,
        turnovers: 0,
        rouboSofrido: 0,
        blockDef: 0,
        faltaAtaqueDef: 0,
        rouboDef: 0,
        desvioDef: 0,
        porTipo: {},
      };
      mapa.set(key, item);
    }
    return item;
  };

  for (const a of acoes) {
    const ladoOposto = a.lado === "nos" ? "adversario" : "nos";

    if (["gol", "fora", "defendido"].includes(a.resultado)) {
      const atleta = garantir(a.atleta_nome, a.lado);
      atleta.arremessosQtd++;
      if (!atleta.porTipo[a.tipo]) atleta.porTipo[a.tipo] = { gols: 0, arr: 0 };
      atleta.porTipo[a.tipo].arr++;
      if (a.resultado === "gol") {
        atleta.golsQtd++;
        atleta.pontos += a.pontos || pontosDoArremesso(a.tipo);
        atleta.porTipo[a.tipo].gols++;
      }
    } else if (a.resultado === "turnover") {
      const atleta = garantir(a.atleta_nome, a.lado);
      atleta.turnovers++;
    } else if (a.resultado === "acao_defensiva") {
      // Na ação defensiva, `a.lado` é quem tinha a posse; o defensor pertence ao `ladoOposto`
      const defensor = garantir(a.atleta_nome, ladoOposto);
      if (a.tipo === "block") {
        defensor.blockDef++;
        if (a.atleta_alvo_nome) {
          const atacante = garantir(a.atleta_alvo_nome, a.lado);
          atacante.bloqueadoSofrido++;
          atacante.arremessosQtd++;
        }
      } else if (a.tipo === "roubo") {
        defensor.rouboDef++;
        if (a.atleta_alvo_nome) {
          const perdedor = garantir(a.atleta_alvo_nome, a.lado);
          perdedor.rouboSofrido++;
          perdedor.turnovers++;
        }
      } else if (a.tipo === "falta_ataque") {
        defensor.faltaAtaqueDef++;
      } else if (a.tipo === "desvio") {
        defensor.desvioDef++;
      }
    }
  }

  return Array.from(mapa.values())
    .map((item) => ({
      ...item,
      pctArremesso: item.arremessosQtd > 0 ? Math.round((item.golsQtd / item.arremessosQtd) * 100) : 0,
    }))
    .sort((a, b) => b.pontos - a.pontos || b.golsQtd - a.golsQtd || a.nome.localeCompare(b.nome));
}
