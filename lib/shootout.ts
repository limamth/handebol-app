import type { SupabaseClient } from "@supabase/supabase-js";
import { dataCurta } from "./periodo";

export const TIPOS_BATIDA: Record<string, string> = { "1pt": "1pt", lancamento_direto: "Lançamento Direto", infracao: "Infração", "6_metros": "6 Metros" };
export const ESTILOS_GOLEIRO: Record<string, string> = { baliza: "Baliza", saida: "Saída" };
export const ROTULO_RESULTADO: Record<string, string> = { convertido: "Convertido", perdido: "Perdido" };

// Mínimo de batidas para entrar no Top 5: 50% da média de batidas por atleta (de quem já bateu), com piso de 3.
// Como é proporcional à média, no começo de uma fase o mínimo é baixo e sobe conforme as batidas acumulam.
export const MINIMO = { fracaoDaMedia: 0.5, piso: 3 };

export type Resultado = "convertido" | "perdido";
export interface Batida {
  id: string; resultado: Resultado; tipo: string | null; observacao: string | null;
  batedorId: string | null; batedorExterno: boolean; goleiroId: string | null; goleiroExterno: boolean;
  criadoEm: string; sessaoId: string; data: string; faseId: string | null; sessaoNome: string | null;
}
export interface Fase { id: string; nome: string; inicio: string; fim: string }
export interface InfoAtleta { nome: string; posicao: string | null; ativo: boolean }
export interface InfoGoleiro { estilo: string; observacoes: string | null; ativo: boolean }
export interface FiltrosBatidas { fase?: string; de?: string; ate?: string }

const um = (o: any) => (Array.isArray(o) ? o[0] : o);
export const fmtPct = (n: number | null) => (n === null ? "-" : `${(n * 100).toFixed(1).replace(".", ",")}%`);
export const pct = (conv: number, total: number) => (total ? conv / total : null);
export const dataBr = (d: string) => d.split("-").reverse().join("/");
export const rotuloFase = (f: Fase) => `${f.nome} (${dataCurta(f.inicio)} a ${dataCurta(f.fim)})`;

export async function carregarFases(supabase: SupabaseClient): Promise<Fase[]> {
  const { data } = await supabase.from("fases_treinamento").select("id, nome, inicio, fim").order("inicio", { ascending: false });
  return (data ?? []) as Fase[];
}

// Fase mostrada por padrão: a que está em andamento, senão a mais recente que já começou, senão todas
export function escolherFase(fases: Fase[], param: string | undefined, hoje: string): string {
  if (param === "todas" || param === "sem") return param;
  if (param && fases.some((f) => f.id === param)) return param;
  return fases.find((f) => f.inicio <= hoje && f.fim >= hoje)?.id ?? fases.find((f) => f.inicio <= hoje)?.id ?? "todas";
}
export const faseDaData = (fases: Fase[], data: string) => fases.find((f) => f.inicio <= data && f.fim >= data)?.id ?? null;

export async function carregarAtletas(supabase: SupabaseClient) {
  const { data } = await supabase.from("usuarios").select("id, nome, posicao, ativo").eq("papel", "atleta").order("nome");
  return new Map<string, InfoAtleta>(((data ?? []) as any[]).map((a) => [a.id as string, { nome: a.nome as string, posicao: a.posicao as string | null, ativo: a.ativo !== false }]));
}
export async function carregarGoleiros(supabase: SupabaseClient) {
  const { data } = await supabase.from("shootout_goleiros").select("atleta_id, estilo, observacoes, ativo");
  return new Map<string, InfoGoleiro>(((data ?? []) as any[]).map((g) => [g.atleta_id as string, { estilo: g.estilo as string, observacoes: g.observacoes as string | null, ativo: g.ativo !== false }]));
}

// Busca em páginas de 1000 (limite do banco por consulta)
export async function buscarBatidas(supabase: SupabaseClient, f: FiltrosBatidas): Promise<Batida[]> {
  const todas: Batida[] = [];
  for (let de = 0; de < 50000; de += 1000) {
    let q = supabase.from("shootout_batidas")
      .select("id, resultado, tipo, observacao, batedor_id, batedor_externo, goleiro_id, goleiro_externo, criado_em, shootout_sessoes!inner(id, nome, data, fase_id)")
      .order("criado_em").order("id").range(de, de + 999);
    if (f.fase === "sem") q = q.is("shootout_sessoes.fase_id", null);
    else if (f.fase && f.fase !== "todas") q = q.eq("shootout_sessoes.fase_id", f.fase);
    if (f.de) q = q.gte("shootout_sessoes.data", f.de);
    if (f.ate) q = q.lte("shootout_sessoes.data", f.ate);
    const { data, error } = await q;
    if (error) throw error;
    for (const r of (data ?? []) as any[]) {
      const s = um(r.shootout_sessoes);
      todas.push({
        id: r.id, resultado: r.resultado, tipo: r.tipo, observacao: r.observacao,
        batedorId: r.batedor_id, batedorExterno: r.batedor_externo, goleiroId: r.goleiro_id, goleiroExterno: r.goleiro_externo,
        criadoEm: r.criado_em, sessaoId: s.id, data: s.data, faseId: s.fase_id, sessaoNome: s.nome,
      });
    }
    if ((data?.length ?? 0) < 1000) break;
  }
  return todas;
}

export interface Resumo { total: number; convertidas: number; perdidas: number; pct: number | null }
export function resumir(batidas: Batida[]): Resumo {
  const convertidas = batidas.filter((b) => b.resultado === "convertido").length;
  return { total: batidas.length, convertidas, perdidas: batidas.length - convertidas, pct: pct(convertidas, batidas.length) };
}
// A ordem das batidas é a data da sessão e, dentro dela, a ordem do registro
export const ordenarCronologico = (b: Batida[]) => [...b].sort((x, y) => x.data.localeCompare(y.data) || x.criadoEm.localeCompare(y.criadoEm));

export function minimoDeBatidas(totais: number[]) {
  const com = totais.filter((n) => n > 0);
  if (!com.length) return { minimo: MINIMO.piso, media: 0 };
  const media = com.reduce((a, b) => a + b, 0) / com.length;
  return { minimo: Math.max(MINIMO.piso, Math.ceil(media * MINIMO.fracaoDaMedia)), media };
}

export interface LinhaBatedor { id: string; nome: string; posicao: string | null; total: number; convertidas: number; pct: number | null; ultimas: Resultado[]; qualificado: boolean }
export function rankingBatedores(batidas: Batida[], atletas: Map<string, InfoAtleta>) {
  const grupos = new Map<string, Batida[]>();
  for (const b of ordenarCronologico(batidas)) {
    if (!b.batedorId) continue;
    grupos.set(b.batedorId, [...(grupos.get(b.batedorId) ?? []), b]);
  }
  const { minimo, media } = minimoDeBatidas([...grupos.values()].map((g) => g.length));
  const linhas: LinhaBatedor[] = [...grupos.entries()].map(([id, g]) => {
    const r = resumir(g);
    const info = atletas.get(id);
    return { id, nome: info?.nome ?? "Atleta removido", posicao: info?.posicao ?? null, total: r.total, convertidas: r.convertidas, pct: r.pct, ultimas: g.slice(-5).map((x) => x.resultado), qualificado: r.total >= minimo };
  });
  linhas.sort((a, b) => Number(b.qualificado) - Number(a.qualificado) || (b.pct ?? 0) - (a.pct ?? 0) || b.total - a.total || a.nome.localeCompare(b.nome));
  return { linhas, minimo, media };
}

// Para o goleiro, a batida perdida pelo batedor conta como defesa
export interface LinhaGoleiro { id: string; nome: string; estilo: string | null; total: number; defesas: number; pct: number | null }
export function rankingGoleiros(batidas: Batida[], atletas: Map<string, InfoAtleta>, goleiros: Map<string, InfoGoleiro>) {
  const grupos = new Map<string, Batida[]>();
  for (const b of batidas) {
    if (!b.goleiroId) continue;
    grupos.set(b.goleiroId, [...(grupos.get(b.goleiroId) ?? []), b]);
  }
  const linhas: LinhaGoleiro[] = [...grupos.entries()].map(([id, g]) => {
    const defesas = g.filter((x) => x.resultado === "perdido").length;
    return { id, nome: atletas.get(id)?.nome ?? "Goleiro", estilo: goleiros.get(id)?.estilo ?? null, total: g.length, defesas, pct: pct(defesas, g.length) };
  });
  return linhas.sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0) || b.total - a.total || a.nome.localeCompare(b.nome));
}

// Estilo do goleiro que enfrentou a batida (null se for externo ou sem cadastro)
export const estiloDaBatida = (b: Batida, goleiros: Map<string, InfoGoleiro>) => (b.goleiroId ? goleiros.get(b.goleiroId)?.estilo ?? null : null);
