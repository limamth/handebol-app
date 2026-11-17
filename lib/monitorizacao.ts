import type { SupabaseClient } from "@supabase/supabase-js";
import { chaveDia } from "./datas";
import { hojeChave, somarDias, inicioDoDia, ultimosDias, rotuloDiaSemana, dataCurta } from "./periodo";

// Limites dos alertas. São convenções comuns no esporte, ajuste conforme a realidade da sua equipa.
export const LIMITES = {
  razaoAlta: 1.5,           // carga dos últimos 7 dias ÷ média semanal dos últimos 28 dias
  minSessoesParaRazao: 6,   // evita alertas falsos quando ainda há pouco histórico
  bemEstarBaixo: 2.5,       // média do bem-estar de um dia (escala de 1 a 5)
  doresAlerta: 2,           // nota de dores 2 ou menos (dor forte) gera alerta
  doresAtencao: 3,          // nota 3 ou menos entra na lista da fisioterapia
  diasAlerta: 3,            // respostas mais velhas que isso não geram alerta
};

export const NOME_QUESTIONARIO = "Bem-estar diário";
export const PERGUNTAS_BEM_ESTAR = [
  { chave: "sono", pergunta: "Qualidade do sono", dica: "1 = muito ruim · 5 = excelente", min: 1, max: 5 },
  { chave: "cansaco", pergunta: "Cansaço", dica: "1 = exausto · 5 = descansado", min: 1, max: 5 },
  { chave: "dores", pergunta: "Dores", dica: "1 = muita dor · 5 = sem dor", min: 1, max: 5 },
  { chave: "humor", pergunta: "Humor e disposição", dica: "1 = muito baixo · 5 = excelente", min: 1, max: 5 },
];
export const ESCALA_BEM_ESTAR = "Em todas as perguntas, 5 é o melhor cenário (descansado, sem dor, ótimo humor) e 1 é o pior.";

// Leitura da nota de dores (1 = muita dor, 5 = sem dor)
export const ROTULO_NOTA_DORES: Record<number, string> = { 1: "Dor muito forte", 2: "Dor forte", 3: "Dor moderada", 4: "Dor leve", 5: "Sem dor" };

export const CATEGORIAS_TESTE = ["Força", "Velocidade", "Resistência", "Salto", "Composição corporal", "Outro"];
export const TESTES_SUGERIDOS = [
  { nome: "Salto vertical (CMJ)", categoria: "Salto", unidade: "cm", menor_e_melhor: false },
  { nome: "Salto horizontal", categoria: "Salto", unidade: "cm", menor_e_melhor: false },
  { nome: "Sprint de 20 m", categoria: "Velocidade", unidade: "s", menor_e_melhor: true },
  { nome: "Teste de agilidade em T", categoria: "Velocidade", unidade: "s", menor_e_melhor: true },
  { nome: "Arremesso de bola medicinal (3 kg)", categoria: "Força", unidade: "m", menor_e_melhor: false },
  { nome: "Yo-Yo Intermittent Recovery 1", categoria: "Resistência", unidade: "m", menor_e_melhor: false },
];

export function mediaRespostas(respostas: Record<string, number>) {
  const v = Object.values(respostas).filter((n) => typeof n === "number");
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
export const fmt1 = (n: number) => n.toFixed(1).replace(".", ",");

export interface UltimaResposta { dia: string; media: number | null; dores: number | null }
export interface Metricas {
  id: string; nome: string; carga7: number; semanalCronica: number; razao: number | null; sessoesComRpe: number;
  bemEstar: number | null; respostas: number; ultima: UltimaResposta | null;
}
export interface Alerta { atletaId: string; atleta: string; motivo: string }
export interface LinhaDia { id: string; nome: string; respostas: Record<string, number> | null; media: number | null; carga: number | null }
export interface LinhaDor { id: string; nome: string; notas: { dia: string; nota: number }[]; ultima: { nota: number; dia: string } | null; pior: number | null; forca: { nivel: string; local: string | null; dia: string } | null; gravidade: number }

const um = (o: any) => (Array.isArray(o) ? o[0] : o);

// Devolve o questionário de bem-estar do clube, criando-o na primeira vez (se o papel permitir).
export async function garantirQuestionario(supabase: SupabaseClient, clubeId: string) {
  const { data: existente } = await supabase.from("questionarios").select("id, perguntas").eq("nome", NOME_QUESTIONARIO).limit(1);
  if (existente?.[0]) return { id: existente[0].id as string, perguntas: existente[0].perguntas as typeof PERGUNTAS_BEM_ESTAR };
  const { data: criado } = await supabase.from("questionarios").insert({ clube_id: clubeId, nome: NOME_QUESTIONARIO, perguntas: PERGUNTAS_BEM_ESTAR }).select("id, perguntas").single();
  return criado
    ? { id: criado.id as string, perguntas: criado.perguntas as typeof PERGUNTAS_BEM_ESTAR }
    : { id: null as string | null, perguntas: PERGUNTAS_BEM_ESTAR };
}

export function derivarAlertas(metricas: Metricas[]): Alerta[] {
  const alertas: Alerta[] = [];
  const limite = somarDias(hojeChave(), -(LIMITES.diasAlerta - 1));
  for (const m of metricas) {
    if (m.razao !== null && m.sessoesComRpe >= LIMITES.minSessoesParaRazao && m.razao > LIMITES.razaoAlta)
      alertas.push({ atletaId: m.id, atleta: m.nome, motivo: `Carga da semana ${Math.round((m.razao - 1) * 100)}% acima da média das últimas 4 semanas` });
    const u = m.ultima;
    if (u && u.dia >= limite) {
      if (u.dores !== null && u.dores <= LIMITES.doresAlerta)
        alertas.push({ atletaId: m.id, atleta: m.nome, motivo: `Dores com nota ${u.dores} (${ROTULO_NOTA_DORES[u.dores] ?? "-"}) em ${dataCurta(u.dia)}` });
      if (u.media !== null && u.media <= LIMITES.bemEstarBaixo)
        alertas.push({ atletaId: m.id, atleta: m.nome, motivo: `Bem-estar baixo em ${dataCurta(u.dia)}: média de ${fmt1(u.media)} em 5` });
    }
  }
  return alertas;
}

export async function listarAtletas(supabase: SupabaseClient, equipaId?: string, apenas?: string[]) {
  let atletas: { id: string; nome: string }[] = [];
  if (equipaId) {
    const { data } = await supabase.from("membros_equipa").select("usuarios(id, nome)").eq("equipa_id", equipaId);
    atletas = ((data ?? []) as any[]).map((m) => um(m.usuarios)).filter(Boolean);
  } else {
    const { data } = await supabase.from("usuarios").select("id, nome").eq("papel", "atleta").eq("ativo", true);
    atletas = (data ?? []) as any[];
  }
  const ordenados = atletas.sort((a, b) => a.nome.localeCompare(b.nome));
  return apenas ? ordenados.filter((a) => apenas.includes(a.id)) : ordenados;
}

// Fase de treinamento que cobre o dia (se houver) e os atletas convocados para ela
export async function convocadosDoDia(supabase: SupabaseClient, dia: string) {
  const { data: fases } = await supabase.from("fases_treinamento").select("id, nome, inicio, fim").lte("inicio", dia).gte("fim", dia).order("inicio");
  const lista = (fases ?? []) as { id: string; nome: string; inicio: string; fim: string }[];
  if (lista.length === 0) return { fase: null as { nome: string } | null, ids: [] as string[] };
  const { data: conv } = await supabase.from("fase_convocados").select("atleta_id").in("fase_id", lista.map((f) => f.id));
  const ids = [...new Set(((conv ?? []) as any[]).map((c) => c.atleta_id as string))];
  return { fase: { nome: lista.map((f) => f.nome).join(" + ") }, ids };
}

// Carga de treino (últimos 28 dias) e resumo do bem-estar. A carga vem só das sessões com RPE:
// a musculação fica de fora, porque acontece sobretudo fora das fases de treinamento.
export async function calcularMonitorizacao(supabase: SupabaseClient, equipaId?: string, apenas?: string[]) {
  const hoje = hojeChave();
  const desde28 = somarDias(hoje, -27);
  const desde7 = somarDias(hoje, -6);
  const dias7 = ultimosDias(7);

  const atletas = await listarAtletas(supabase, equipaId, apenas);
  const vazio = { metricas: [] as Metricas[], alertas: [] as Alerta[], diario: dias7.map((d) => ({ dia: rotuloDiaSemana(d), ua: 0 })) };
  if (atletas.length === 0) return vazio;
  const ids = atletas.map((a) => a.id);

  const [{ data: rpe }, { data: resp }] = await Promise.all([
    supabase.from("rpe_sessao").select("atleta_id, carga_ua, sessoes!inner(inicio)").in("atleta_id", ids).gte("sessoes.inicio", inicioDoDia(desde28)),
    supabase.from("respostas_questionario").select("atleta_id, dia, respostas").in("atleta_id", ids).gte("dia", somarDias(hoje, -13)).order("dia", { ascending: false }),
  ]);

  const carga = new Map<string, { c7: number; c28: number; n: number }>();
  const diario = new Map<string, { soma: number; atletas: Set<string> }>();
  for (const r of (rpe ?? []) as any[]) {
    const dia = chaveDia(um(r.sessoes).inicio);
    if (dia > hoje) continue;
    const a = carga.get(r.atleta_id) ?? { c7: 0, c28: 0, n: 0 };
    a.c28 += r.carga_ua; a.n += 1;
    if (dia >= desde7) {
      a.c7 += r.carga_ua;
      const d = diario.get(dia) ?? { soma: 0, atletas: new Set<string>() };
      d.soma += r.carga_ua; d.atletas.add(r.atleta_id); diario.set(dia, d);
    }
    carga.set(r.atleta_id, a);
  }

  const bem = new Map<string, { medias: number[]; ultima: UltimaResposta | null }>();
  for (const r of (resp ?? []) as any[]) {
    const e = bem.get(r.atleta_id) ?? { medias: [], ultima: null };
    const media = mediaRespostas(r.respostas ?? {});
    if (media !== null && e.medias.length < 3) e.medias.push(media);
    if (!e.ultima) e.ultima = { dia: r.dia, media, dores: typeof r.respostas?.dores === "number" ? r.respostas.dores : null };
    bem.set(r.atleta_id, e);
  }

  const metricas: Metricas[] = atletas.map((a) => {
    const c = carga.get(a.id) ?? { c7: 0, c28: 0, n: 0 };
    const semanalCronica = c.c28 / 4;
    const b = bem.get(a.id) ?? { medias: [], ultima: null };
    return {
      id: a.id, nome: a.nome, carga7: c.c7, semanalCronica,
      razao: semanalCronica > 0 ? c.c7 / semanalCronica : null,
      sessoesComRpe: c.n,
      bemEstar: b.medias.length ? b.medias.reduce((x, y) => x + y, 0) / b.medias.length : null,
      respostas: b.medias.length,
      ultima: b.ultima,
    };
  });

  return {
    metricas,
    alertas: derivarAlertas(metricas),
    diario: dias7.map((d) => {
      const x = diario.get(d);
      return { dia: rotuloDiaSemana(d), ua: x ? Math.round(x.soma / x.atletas.size) : 0 };
    }),
  };
}

// Acompanhamento de um dia: todos os atletas do filtro aparecem, tenham ou não treinado ou respondido.
export async function carregarDia(supabase: SupabaseClient, equipaId: string | undefined, dia: string, apenas?: string[]) {
  const atletas = await listarAtletas(supabase, equipaId, apenas);
  if (atletas.length === 0) return { linhas: [] as LinhaDia[] };
  const ids = atletas.map((a) => a.id);

  const [{ data: resp }, { data: rpe }] = await Promise.all([
    supabase.from("respostas_questionario").select("atleta_id, respostas").in("atleta_id", ids).eq("dia", dia),
    supabase.from("rpe_sessao").select("atleta_id, carga_ua, sessoes!inner(inicio)").in("atleta_id", ids)
      .gte("sessoes.inicio", inicioDoDia(dia)).lt("sessoes.inicio", inicioDoDia(somarDias(dia, 1))),
  ]);

  const respostasDe = new Map<string, Record<string, number>>();
  for (const r of (resp ?? []) as any[]) if (!respostasDe.has(r.atleta_id)) respostasDe.set(r.atleta_id, r.respostas ?? {});
  const cargaDe = new Map<string, number>();
  for (const r of (rpe ?? []) as any[]) {
    if (r.carga_ua === null || r.carga_ua === undefined) continue;
    cargaDe.set(r.atleta_id, (cargaDe.get(r.atleta_id) ?? 0) + r.carga_ua);
  }

  const linhas: LinhaDia[] = atletas.map((a) => {
    const respostas = respostasDe.get(a.id) ?? null;
    return { id: a.id, nome: a.nome, respostas, media: respostas ? mediaRespostas(respostas) : null, carga: cargaDe.get(a.id) ?? null };
  });
  return { linhas };
}

// Aba Dores: notas de dores do bem-estar e dores moderadas ou fortes informadas na musculação
export async function carregarDores(supabase: SupabaseClient, equipaId: string | undefined, hoje: string, dias: number) {
  const atletas = await listarAtletas(supabase, equipaId);
  if (atletas.length === 0) return [] as LinhaDor[];
  const ids = atletas.map((a) => a.id);
  const desde = somarDias(hoje, -(dias - 1));

  const [{ data: resp }, { data: forca }] = await Promise.all([
    supabase.from("respostas_questionario").select("atleta_id, dia, respostas").in("atleta_id", ids).gte("dia", desde).order("dia"),
    supabase.from("sessoes_forca").select("atleta_id, dia, dor, dor_local").in("atleta_id", ids).gte("dia", desde).in("dor", ["moderada", "forte"]).order("dia", { ascending: false }),
  ]);

  const notasDe = new Map<string, { dia: string; nota: number }[]>();
  for (const r of (resp ?? []) as any[]) {
    if (typeof r.respostas?.dores !== "number") continue;
    notasDe.set(r.atleta_id, [...(notasDe.get(r.atleta_id) ?? []), { dia: r.dia, nota: r.respostas.dores }]);
  }
  const gravidadeForca: Record<string, number> = { moderada: 2, forte: 3 };
  const piorForca = new Map<string, { nivel: string; local: string | null; dia: string }>();
  for (const f of (forca ?? []) as any[]) {
    const atual = piorForca.get(f.atleta_id);
    if (!atual || gravidadeForca[f.dor] > gravidadeForca[atual.nivel]) piorForca.set(f.atleta_id, { nivel: f.dor, local: f.dor_local, dia: f.dia });
  }

  const linhas: LinhaDor[] = atletas.map((a) => {
    const notas = notasDe.get(a.id) ?? [];
    const ultima = notas.length ? notas[notas.length - 1] : null;
    const f = piorForca.get(a.id) ?? null;
    const gNota = ultima ? 5 - ultima.nota : 0;            // nota 5 = 0, nota 1 = 4
    const gForca = f ? gravidadeForca[f.nivel] : 0;
    return { id: a.id, nome: a.nome, notas, ultima, pior: notas.length ? Math.min(...notas.map((n) => n.nota)) : null, forca: f, gravidade: Math.max(gNota, gForca) };
  });
  return linhas.sort((x, y) => y.gravidade - x.gravidade || x.nome.localeCompare(y.nome));
}
