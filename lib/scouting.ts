import type { SupabaseClient } from "@supabase/supabase-js";

export type QuadranteBaliza =
  | "sup_esq"
  | "sup_cen"
  | "sup_dir"
  | "med_esq"
  | "med_cen"
  | "med_dir"
  | "inf_esq"
  | "inf_cen"
  | "inf_dir"
  | "trave"
  | "fora";

export type TecnicaSaida = "aerea" | "costela" | "cobertura" | "deita_corpo" | "fuga";
export type EstiloGoleiro = "baliza" | "saida";

// Tipos de Arremesso para Jogo Regulamentar (especificado pelo usuário)
export type TipoArremessoJogo = "giro" | "aerea" | "especialista" | "1pt" | "6m";

// Setores de Origem para Jogo Regulamentar (especificado pelo usuário)
export type SetorOrigemJogo = "lateral_esq" | "meio_esq" | "meio_dir" | "lateral_dir";

export const TIPOS_ARREMESSO_JOGO: TipoArremessoJogo[] = ["giro", "aerea", "especialista", "1pt", "6m"];
export const SETORES_ORIGEM_JOGO: SetorOrigemJogo[] = ["lateral_esq", "meio_esq", "meio_dir", "lateral_dir"];

export const ROTULO_TIPO_JOGO: Record<TipoArremessoJogo, { rotulo: string; pontos: number; desc: string }> = {
  giro: { rotulo: "Giro", pontos: 2, desc: "Giro 360° (2 pontos)" },
  aerea: { rotulo: "Aérea", pontos: 2, desc: "Ponte aérea / recepção em voo (2 pontos)" },
  especialista: { rotulo: "Especialista", pontos: 2, desc: "Arremesso do atleta especialista / coringa (2 pontos)" },
  "1pt": { rotulo: "1pt", pontos: 1, desc: "Arremesso simples de 1 ponto" },
  "6m": { rotulo: "6m", pontos: 2, desc: "Tiro de 6 metros / pênalti (2 pontos)" },
};

export const ROTULO_SETOR_JOGO: Record<SetorOrigemJogo, string> = {
  lateral_esq: "Lateral Esquerda",
  meio_esq: "Meio Esquerda",
  meio_dir: "Meio Direita",
  lateral_dir: "Lateral Direita",
};

export const QUADRANTES_GOL: QuadranteBaliza[] = [
  "sup_esq", "sup_cen", "sup_dir",
  "med_esq", "med_cen", "med_dir",
  "inf_esq", "inf_cen", "inf_dir",
];

export const ROTULO_QUADRANTE: Record<QuadranteBaliza, string> = {
  sup_esq: "Superior Esquerdo",
  sup_cen: "Superior Centro",
  sup_dir: "Superior Direito",
  med_esq: "Médio Esquerdo",
  med_cen: "Médio Centro",
  med_dir: "Médio Direito",
  inf_esq: "Inferior Esquerdo",
  inf_cen: "Inferior Centro",
  inf_dir: "Inferior Direito",
  trave: "Trave / Travessão",
  fora: "Para Fora",
};

export const ROTULO_TECNICA_SAIDA: Record<TecnicaSaida, { rotulo: string; desc: string }> = {
  aerea: { rotulo: "Aérea", desc: "Passe ou ponte aérea em direção à baliza" },
  costela: { rotulo: "Arremesso na costela", desc: "Tiro rápido na linha de cintura do goleiro que sai" },
  cobertura: { rotulo: "Arremesso por cobertura", desc: "Lob / vaselina por cima do goleiro" },
  deita_corpo: { rotulo: "Deita o corpo", desc: "Finta de corpo caindo/deitando lateralmente" },
  fuga: { rotulo: "Corrida para fuga", desc: "Finta em velocidade contornando o goleiro" },
};

export interface EquipeAdversaria {
  id: string;
  nome: string;
  categoria?: string | null;
  criadoEm: string;
  totalAtletas?: number;
  totalBatidas?: number;
}

export interface AtletaAdversario {
  id: string;
  equipeAdversariaId: string;
  nome: string;
  numero?: number | null;
  posicao?: string | null;
  mao?: "destro" | "canhoto" | null;
  observacoes?: string | null;
  criadoEm: string;
}

export interface ScoutFinalizacao {
  id: string;
  equipeAdversariaId: string;
  atletaAdversarioId?: string | null;
  origem: "shootout" | "jogo";
  estiloGoleiro?: EstiloGoleiro | null;
  quadranteBaliza?: QuadranteBaliza | null;
  tecnicaSaida?: TecnicaSaida | null;
  zonaCampo?: SetorOrigemJogo | null;
  tipoFinalizacao?: TipoArremessoJogo | null;
  resultado: "convertido" | "perdido";
  desfechoDetalhe?: "gol" | "defesa" | "fora" | "trave" | null;
  nossoGoleiroId?: string | null;
  observacao?: string | null;
  criadoEm: string;
  atletaNome?: string;
  atletaNumero?: number;
}

export async function carregarEquipesAdversarias(supabase: SupabaseClient): Promise<EquipeAdversaria[]> {
  const { data } = await supabase
    .from("equipes_adversarias")
    .select("id, nome, categoria, criado_em, atletas_adversarios(count), scout_finalizacoes_adversario(count)")
    .order("nome");

  return ((data ?? []) as any[]).map((e) => ({
    id: e.id,
    nome: e.nome,
    categoria: e.categoria,
    criadoEm: e.criado_em,
    totalAtletas: e.atletas_adversarios?.[0]?.count ?? 0,
    totalBatidas: e.scout_finalizacoes_adversario?.[0]?.count ?? 0,
  }));
}

export async function carregarAtletasAdversarios(
  supabase: SupabaseClient,
  equipeId?: string
): Promise<AtletaAdversario[]> {
  let q = supabase
    .from("atletas_adversarios")
    .select("id, equipe_adversaria_id, nome, numero, posicao, mao, observacoes, criado_em")
    .order("numero", { ascending: true, nullsFirst: false })
    .order("nome");

  if (equipeId) q = q.eq("equipe_adversaria_id", equipeId);

  const { data } = await q;
  return ((data ?? []) as any[]).map((a) => ({
    id: a.id,
    equipeAdversariaId: a.equipe_adversaria_id,
    nome: a.nome,
    numero: a.numero,
    posicao: a.posicao,
    mao: a.mao,
    observacoes: a.observacoes,
    criadoEm: a.criado_em,
  }));
}

export async function carregarFinalizacoesAdversarias(
  supabase: SupabaseClient,
  filtros: { equipeId?: string; atletaId?: string; estiloGoleiro?: EstiloGoleiro; origem?: "shootout" | "jogo" }
): Promise<ScoutFinalizacao[]> {
  let q = supabase
    .from("scout_finalizacoes_adversario")
    .select(`
      id, equipe_adversaria_id, atleta_adversario_id, origem, estilo_goleiro,
      quadrante_baliza, tecnica_saida, zona_campo, tipo_finalizacao, resultado, desfecho_detalhe, nosso_goleiro_id,
      observacao, criado_em,
      atletas_adversarios(nome, numero)
    `)
    .order("criado_em", { ascending: false });

  if (filtros.equipeId) q = q.eq("equipe_adversaria_id", filtros.equipeId);
  if (filtros.atletaId) q = q.eq("atleta_adversario_id", filtros.atletaId);
  if (filtros.estiloGoleiro) q = q.eq("estilo_goleiro", filtros.estiloGoleiro);
  if (filtros.origem) q = q.eq("origem", filtros.origem);

  const { data } = await q;
  return ((data ?? []) as any[]).map((f) => ({
    id: f.id,
    equipeAdversariaId: f.equipe_adversaria_id,
    atletaAdversarioId: f.atleta_adversario_id,
    origem: f.origem,
    estiloGoleiro: f.estilo_goleiro,
    quadranteBaliza: f.quadrante_baliza,
    tecnicaSaida: f.tecnica_saida,
    zonaCampo: f.zona_campo as SetorOrigemJogo | null,
    tipoFinalizacao: f.tipo_finalizacao as TipoArremessoJogo | null,
    resultado: f.resultado,
    desfechoDetalhe: f.desfecho_detalhe,
    nossoGoleiroId: f.nosso_goleiro_id,
    observacao: f.observacao,
    criadoEm: f.criado_em,
    atletaNome: f.atletas_adversarios?.nome,
    atletaNumero: f.atletas_adversarios?.numero,
  }));
}

export interface EstatisticasBaliza {
  total: number;
  gols: number;
  defesasOuErros: number;
  porQuadrante: Record<QuadranteBaliza, { total: number; gols: number; defesasOuErros: number; pctGol: number | null }>;
  quadranteMaisFrequente: QuadranteBaliza | null;
  quadranteMaisPerigoso: QuadranteBaliza | null; // maior número de gols
}

export function calcularEstatisticasBaliza(
  finalizacoes: ScoutFinalizacao[],
  apenasGoleiroBaliza = true
): EstatisticasBaliza {
  const deBaliza = finalizacoes.filter((f) =>
    (apenasGoleiroBaliza ? f.estiloGoleiro === "baliza" : true) && f.quadranteBaliza
  );
  const contagens: Record<QuadranteBaliza, { total: number; gols: number; defesasOuErros: number; pctGol: number | null }> = {
    sup_esq: { total: 0, gols: 0, defesasOuErros: 0, pctGol: null },
    sup_cen: { total: 0, gols: 0, defesasOuErros: 0, pctGol: null },
    sup_dir: { total: 0, gols: 0, defesasOuErros: 0, pctGol: null },
    med_esq: { total: 0, gols: 0, defesasOuErros: 0, pctGol: null },
    med_cen: { total: 0, gols: 0, defesasOuErros: 0, pctGol: null },
    med_dir: { total: 0, gols: 0, defesasOuErros: 0, pctGol: null },
    inf_esq: { total: 0, gols: 0, defesasOuErros: 0, pctGol: null },
    inf_cen: { total: 0, gols: 0, defesasOuErros: 0, pctGol: null },
    inf_dir: { total: 0, gols: 0, defesasOuErros: 0, pctGol: null },
    trave:   { total: 0, gols: 0, defesasOuErros: 0, pctGol: null },
    fora:    { total: 0, gols: 0, defesasOuErros: 0, pctGol: null },
  };

  let gols = 0;
  deBaliza.forEach((f) => {
    const q = f.quadranteBaliza!;
    if (contagens[q]) {
      contagens[q].total += 1;
      if (f.resultado === "convertido") {
        contagens[q].gols += 1;
        gols += 1;
      } else {
        contagens[q].defesasOuErros += 1;
      }
    }
  });

  Object.values(contagens).forEach((item) => {
    item.pctGol = item.total ? item.gols / item.total : null;
  });

  let quadranteMaisFrequente: QuadranteBaliza | null = null;
  let maxTotal = 0;
  let quadranteMaisPerigoso: QuadranteBaliza | null = null;
  let maxGols = 0;

  QUADRANTES_GOL.forEach((q) => {
    if (contagens[q].total > maxTotal) {
      maxTotal = contagens[q].total;
      quadranteMaisFrequente = q;
    }
    if (contagens[q].gols > maxGols) {
      maxGols = contagens[q].gols;
      quadranteMaisPerigoso = q;
    }
  });

  return {
    total: deBaliza.length,
    gols,
    defesasOuErros: deBaliza.length - gols,
    porQuadrante: contagens,
    quadranteMaisFrequente,
    quadranteMaisPerigoso,
  };
}

export interface EstatisticasSaida {
  total: number;
  gols: number;
  defesasOuErros: number;
  porTecnica: Record<TecnicaSaida, { total: number; gols: number; defesasOuErros: number; pctFrequencia: number; pctEficacia: number | null }>;
  tecnicaPredominante: TecnicaSaida | null;
  tecnicaMaisLetal: TecnicaSaida | null;
}

export function calcularEstatisticasSaida(finalizacoes: ScoutFinalizacao[]): EstatisticasSaida {
  const deSaida = finalizacoes.filter((f) => f.estiloGoleiro === "saida" && f.tecnicaSaida);
  const contagens: Record<TecnicaSaida, { total: number; gols: number; defesasOuErros: number; pctFrequencia: number; pctEficacia: number | null }> = {
    aerea:       { total: 0, gols: 0, defesasOuErros: 0, pctFrequencia: 0, pctEficacia: null },
    costela:     { total: 0, gols: 0, defesasOuErros: 0, pctFrequencia: 0, pctEficacia: null },
    cobertura:   { total: 0, gols: 0, defesasOuErros: 0, pctFrequencia: 0, pctEficacia: null },
    deita_corpo: { total: 0, gols: 0, defesasOuErros: 0, pctFrequencia: 0, pctEficacia: null },
    fuga:        { total: 0, gols: 0, defesasOuErros: 0, pctFrequencia: 0, pctEficacia: null },
  };

  let gols = 0;
  deSaida.forEach((f) => {
    const t = f.tecnicaSaida!;
    if (contagens[t]) {
      contagens[t].total += 1;
      if (f.resultado === "convertido") {
        contagens[t].gols += 1;
        gols += 1;
      } else {
        contagens[t].defesasOuErros += 1;
      }
    }
  });

  const total = deSaida.length;
  let tecnicaPredominante: TecnicaSaida | null = null;
  let maxTotal = 0;
  let tecnicaMaisLetal: TecnicaSaida | null = null;
  let maxGols = 0;

  (Object.keys(contagens) as TecnicaSaida[]).forEach((t) => {
    const item = contagens[t];
    item.pctFrequencia = total ? item.total / total : 0;
    item.pctEficacia = item.total ? item.gols / item.total : null;

    if (item.total > maxTotal) {
      maxTotal = item.total;
      tecnicaPredominante = t;
    }
    if (item.gols > maxGols) {
      maxGols = item.gols;
      tecnicaMaisLetal = t;
    }
  });

  return {
    total,
    gols,
    defesasOuErros: total - gols,
    porTecnica: contagens,
    tecnicaPredominante,
    tecnicaMaisLetal,
  };
}

export interface EstatisticasJogo {
  total: number;
  gols: number;
  defesasOuErros: number;
  aproveitamentoGeral: number | null;
  pontosTotais: number;
  porTipo: Record<
    TipoArremessoJogo,
    {
      total: number;
      gols: number;
      defesasOuErros: number;
      pontos: number;
      pctGol: number | null;
      pctFrequencia: number;
    }
  >;
  porSetor: Record<
    SetorOrigemJogo,
    {
      total: number;
      gols: number;
      defesasOuErros: number;
      pctGol: number | null;
      pctFrequencia: number;
    }
  >;
  tiros6m: {
    total: number;
    gols: number;
    defesasOuErros: number;
    pctGol: number | null;
  };
  statsBaliza: EstatisticasBaliza;
}

export function calcularEstatisticasJogo(finalizacoes: ScoutFinalizacao[]): EstatisticasJogo {
  const deJogo = finalizacoes.filter((f) => f.origem === "jogo");
  const total = deJogo.length;

  const porTipo: Record<TipoArremessoJogo, { total: number; gols: number; defesasOuErros: number; pontos: number; pctGol: number | null; pctFrequencia: number }> = {
    giro:         { total: 0, gols: 0, defesasOuErros: 0, pontos: 0, pctGol: null, pctFrequencia: 0 },
    aerea:        { total: 0, gols: 0, defesasOuErros: 0, pontos: 0, pctGol: null, pctFrequencia: 0 },
    especialista: { total: 0, gols: 0, defesasOuErros: 0, pontos: 0, pctGol: null, pctFrequencia: 0 },
    "1pt":        { total: 0, gols: 0, defesasOuErros: 0, pontos: 0, pctGol: null, pctFrequencia: 0 },
    "6m":         { total: 0, gols: 0, defesasOuErros: 0, pontos: 0, pctGol: null, pctFrequencia: 0 },
  };

  const porSetor: Record<SetorOrigemJogo, { total: number; gols: number; defesasOuErros: number; pctGol: number | null; pctFrequencia: number }> = {
    lateral_esq: { total: 0, gols: 0, defesasOuErros: 0, pctGol: null, pctFrequencia: 0 },
    meio_esq:    { total: 0, gols: 0, defesasOuErros: 0, pctGol: null, pctFrequencia: 0 },
    meio_dir:    { total: 0, gols: 0, defesasOuErros: 0, pctGol: null, pctFrequencia: 0 },
    lateral_dir: { total: 0, gols: 0, defesasOuErros: 0, pctGol: null, pctFrequencia: 0 },
  };

  const tiros6m = {
    total: 0,
    gols: 0,
    defesasOuErros: 0,
    pctGol: null as number | null,
  };

  let gols = 0;
  let pontosTotais = 0;

  for (const f of deJogo) {
    const ehGol = f.resultado === "convertido";
    if (ehGol) gols += 1;

    // Tipo de arremesso
    if (f.tipoFinalizacao && porTipo[f.tipoFinalizacao]) {
      const t = porTipo[f.tipoFinalizacao];
      t.total += 1;
      if (ehGol) {
        t.gols += 1;
        const pts = ROTULO_TIPO_JOGO[f.tipoFinalizacao].pontos;
        t.pontos += pts;
        pontosTotais += pts;
      } else {
        t.defesasOuErros += 1;
      }
    }

    // Setor ou 6m (6m nunca tem setor)
    if (f.tipoFinalizacao === "6m") {
      tiros6m.total += 1;
      if (ehGol) {
        tiros6m.gols += 1;
      } else {
        tiros6m.defesasOuErros += 1;
      }
    } else if (f.zonaCampo && porSetor[f.zonaCampo]) {
      const s = porSetor[f.zonaCampo];
      s.total += 1;
      if (ehGol) {
        s.gols += 1;
      } else {
        s.defesasOuErros += 1;
      }
    }
  }

  // Frequências e eficiências por tipo
  for (const k of TIPOS_ARREMESSO_JOGO) {
    const item = porTipo[k];
    item.pctFrequencia = total ? item.total / total : 0;
    item.pctGol = item.total ? item.gols / item.total : null;
  }

  // Frequências e eficiências por setor
  const totalEmSetores = Object.values(porSetor).reduce((acc, curr) => acc + curr.total, 0);
  for (const k of SETORES_ORIGEM_JOGO) {
    const item = porSetor[k];
    item.pctFrequencia = totalEmSetores ? item.total / totalEmSetores : 0;
    item.pctGol = item.total ? item.gols / item.total : null;
  }

  tiros6m.pctGol = tiros6m.total ? tiros6m.gols / tiros6m.total : null;

  const statsBaliza = calcularEstatisticasBaliza(deJogo, false);

  return {
    total,
    gols,
    defesasOuErros: total - gols,
    aproveitamentoGeral: total ? gols / total : null,
    pontosTotais,
    porTipo,
    porSetor,
    tiros6m,
    statsBaliza,
  };
}
