import Link from "next/link";
import { obterPerfil } from "@/lib/sessao";
import { hojeChave } from "@/lib/periodo";
import { Aviso } from "@/components/ui/Aviso";
import { CartaoIndicador } from "@/components/dashboard/CartaoIndicador";
import { GraficoEvolucao } from "@/components/avaliacoes/graficos";
import { COR_ESTILO } from "@/components/shootout/estilos";
import {
  ESTILOS_GOLEIRO, TIPOS_BATIDA, buscarBatidas, carregarAtletas, carregarFases, carregarGoleiros, escolherFase, fmtPct, ordenarCronologico, pct,
  rankingBatedores, rankingGoleiros, resumir, rotuloFase, type Batida,
} from "@/lib/shootout";

const campo = "mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5";
const ABAS = [["atletas", "Atletas"], ["goleiros", "Goleiros"], ["evolucao", "Evolução"], ["confrontos", "Confrontos"], ["tipos", "Tipos de batida"]] as const;
const uuid = (v?: string) => !!v && /^[0-9a-f-]{36}$/i.test(v);
const dataOk = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
type Busca = { fase?: string; aba?: string; atleta?: string; goleiro?: string; de?: string; ate?: string; aviso?: string; erro?: string };

function agrupar(batidas: Batida[], chave: (b: Batida) => string) {
  const m = new Map<string, Batida[]>();
  for (const b of batidas) m.set(chave(b), [...(m.get(chave(b)) ?? []), b]);
  return m;
}

export default async function VisaoGeral({ searchParams }: { searchParams: Busca }) {
  const { supabase } = await obterPerfil();
  const hoje = hojeChave();
  const [fases, atletas, goleiros] = await Promise.all([carregarFases(supabase), carregarAtletas(supabase), carregarGoleiros(supabase)]);
  const fase = escolherFase(fases, searchParams.fase, hoje);
  const aba = ABAS.some(([k]) => k === searchParams.aba) ? searchParams.aba! : "atletas";
  const atleta = uuid(searchParams.atleta) ? searchParams.atleta! : "";
  const goleiro = uuid(searchParams.goleiro) ? searchParams.goleiro! : "";
  const de = dataOk(searchParams.de) ? searchParams.de! : "";
  const ate = dataOk(searchParams.ate) ? searchParams.ate! : "";

  const todas = await buscarBatidas(supabase, { fase, de, ate });
  const doAtleta = (b: Batida) => !atleta || b.batedorId === atleta;
  const doGoleiro = (b: Batida) => !goleiro || b.goleiroId === goleiro;
  const filtradas = todas.filter((b) => doAtleta(b) && doGoleiro(b));
  const r = resumir(filtradas);

  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ fase, aba, ...extra });
    if (atleta) p.set("atleta", atleta); if (goleiro) p.set("goleiro", goleiro); if (de) p.set("de", de); if (ate) p.set("ate", ate);
    return `/shootout?${p}`;
  };
  const nomeAtleta = (id: string | null) => (id ? atletas.get(id)?.nome ?? "Atleta removido" : "Atleta de fora");
  const nomeGoleiro = (b: Batida) => (b.goleiroExterno ? "Adversários de fora" : b.goleiroId ? atletas.get(b.goleiroId)?.nome ?? "Goleiro" : "Goleiro removido");
  const todosAtletas = [...atletas.entries()].sort((a, b) => a[1].nome.localeCompare(b[1].nome));
  const todosGoleiros = [...goleiros.keys()].map((id) => ({ id, nome: atletas.get(id)?.nome ?? "Goleiro" })).sort((a, b) => a.nome.localeCompare(b.nome));

  const linha = (esq: React.ReactNode, sub: React.ReactNode, direita: string, detalhe: string, key: string) => (
    <li key={key} className="flex items-center justify-between gap-3 rounded-md bg-fundo px-4 py-3">
      <div className="min-w-0"><p className="truncate font-medium">{esq}</p><p className="text-xs text-suave">{sub}</p></div>
      <div className="text-right"><p className="font-titulo text-2xl font-bold">{direita}</p><p className="text-xs text-suave">{detalhe}</p></div>
    </li>
  );

  let conteudo: React.ReactNode = null;
  if (aba === "atletas") {
    const { linhas, minimo } = rankingBatedores(todas.filter(doGoleiro), atletas);
    conteudo = linhas.length === 0 ? <p className="text-suave">Nenhuma batida neste filtro.</p> : (
      <>
        <ol className="space-y-2">
          {linhas.map((l, i) => linha(
            <>{l.qualificado ? `${i + 1}º ` : ""}{l.nome}{l.posicao ? <span className="ml-2 text-xs font-normal text-suave">{l.posicao}</span> : null}</>,
            l.qualificado ? "" : `abaixo do mínimo de ${minimo} batidas`, fmtPct(l.pct), `${l.convertidas}/${l.total} convertidas`, l.id))}
        </ol>
        <p className="mt-2 text-xs text-suave">Quem tem menos de {minimo} batidas aparece no fim da lista, sem posição.</p>
      </>
    );
  } else if (aba === "goleiros") {
    const linhas = rankingGoleiros(todas.filter(doAtleta), atletas, goleiros);
    conteudo = linhas.length === 0 ? <p className="text-suave">Nenhuma batida neste filtro.</p> : (
      <>
        <ol className="space-y-2">
          {linhas.map((l, i) => linha(
            <>{i + 1}º {l.nome}{l.estilo ? <span className={`ml-2 rounded px-2 py-0.5 text-xs font-normal ${COR_ESTILO[l.estilo]}`}>{ESTILOS_GOLEIRO[l.estilo]}</span> : null}</>,
            `${l.total} batida${l.total === 1 ? "" : "s"} enfrentada${l.total === 1 ? "" : "s"}`, fmtPct(l.pct), `${l.defesas} defesas`, l.id))}
        </ol>
        <p className="mt-2 text-xs text-suave">Para o goleiro, a batida perdida pelo batedor conta como defesa.</p>
      </>
    );
  } else if (aba === "evolucao") {
    if (!atleta) conteudo = <p className="text-suave">Escolha um atleta nos filtros para ver a evolução do aproveitamento dele sessão a sessão.</p>;
    else {
      const sessoes = [...agrupar(ordenarCronologico(todas.filter((b) => doAtleta(b) && doGoleiro(b))), (b) => b.sessaoId).values()];
      const pontos = sessoes.map((g) => { const x = resumir(g); return { data: g[0].data, valor: (x.pct ?? 0) * 100, n: x.total }; }).sort((a, b) => a.data.localeCompare(b.data));
      conteudo = pontos.length < 2
        ? <p className="text-suave">Precisa de batidas em pelo menos 2 sessões para mostrar a evolução.</p>
        : <GraficoEvolucao pontos={pontos} unidade="%" />;
    }
  } else if (aba === "confrontos") {
    if (atleta) {
      const grupos = agrupar(todas.filter(doAtleta), (b) => (b.goleiroExterno ? "externo" : b.goleiroId ?? "removido"));
      const linhas = [...grupos.values()].map((g) => ({ nome: nomeGoleiro(g[0]), ...resumir(g) })).sort((a, b) => b.total - a.total);
      conteudo = <><p className="mb-2 text-sm text-suave">Desempenho de {nomeAtleta(atleta)} contra cada goleiro.</p><ul className="space-y-2">{linhas.map((l) => linha(l.nome, `${l.total} batida${l.total === 1 ? "" : "s"}`, fmtPct(l.pct), `${l.convertidas} convertidas`, l.nome))}</ul></>;
    } else if (goleiro) {
      const grupos = agrupar(todas.filter(doGoleiro), (b) => b.batedorId ?? "externo");
      const linhas = [...grupos.values()].map((g) => ({ nome: nomeAtleta(g[0].batedorId), ...resumir(g) })).sort((a, b) => b.total - a.total);
      conteudo = <><p className="mb-2 text-sm text-suave">Desempenho de cada atleta contra {atletas.get(goleiro)?.nome ?? "o goleiro"}.</p><ul className="space-y-2">{linhas.map((l) => linha(l.nome, `${l.total} batida${l.total === 1 ? "" : "s"}`, fmtPct(l.pct), `${l.convertidas} convertidas`, l.nome))}</ul></>;
    } else conteudo = <p className="text-suave">Escolha um atleta ou um goleiro nos filtros para ver os confrontos.</p>;
  } else {
    const grupos = agrupar(filtradas, (b) => b.tipo ?? "sem");
    const linhas = [...grupos.entries()].map(([k, g]) => ({ nome: k === "sem" ? "Sem tipo informado" : TIPOS_BATIDA[k], ...resumir(g) })).sort((a, b) => b.total - a.total);
    conteudo = linhas.length === 0 ? <p className="text-suave">Nenhuma batida neste filtro.</p> : <ul className="space-y-2">{linhas.map((l) => linha(l.nome, `${l.total} batida${l.total === 1 ? "" : "s"}`, fmtPct(l.pct), `${l.convertidas} convertidas`, l.nome))}</ul>;
  }

  return (
    <div className="space-y-5">
      <Aviso key={Date.now()} mensagem={searchParams.erro ?? searchParams.aviso} tipo={searchParams.erro ? "erro" : "ok"} />

      <form action="/shootout" className="grid gap-3 rounded-lg border border-linha bg-white p-4 sm:grid-cols-3">
        <input type="hidden" name="aba" value={aba} />
        <label className="block text-sm font-medium">Fase de treinamento
          <select name="fase" defaultValue={fase} className={campo}>
            <option value="todas">Todas as fases</option>
            {fases.map((f) => <option key={f.id} value={f.id}>{rotuloFase(f)}</option>)}
            <option value="sem">Sem fase</option>
          </select>
        </label>
        <label className="block text-sm font-medium">Atleta
          <select name="atleta" defaultValue={atleta} className={campo}><option value="">Todos os atletas</option>{todosAtletas.map(([id, a]) => <option key={id} value={id}>{a.nome}</option>)}</select>
        </label>
        <label className="block text-sm font-medium">Goleiro
          <select name="goleiro" defaultValue={goleiro} className={campo}><option value="">Todos os goleiros</option>{todosGoleiros.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}</select>
        </label>
        <label className="block text-sm font-medium">De<input name="de" type="date" defaultValue={de} className={campo} /></label>
        <label className="block text-sm font-medium">Até<input name="ate" type="date" defaultValue={ate} className={campo} /></label>
        <div className="flex items-end gap-3"><button className="rounded-md border border-linha px-4 py-2.5 text-sm hover:bg-fundo">Aplicar</button><Link href="/shootout" className="text-sm text-quadra-600 underline">Limpar</Link></div>
      </form>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Resumo">
        <CartaoIndicador rotulo="Total de batidas" valor={String(r.total)} />
        <CartaoIndicador rotulo="Convertidas" valor={String(r.convertidas)} />
        <CartaoIndicador rotulo="Perdidas" valor={String(r.perdidas)} />
        <CartaoIndicador rotulo="Aproveitamento" valor={fmtPct(r.pct)} />
      </section>

      <nav aria-label="Análises" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {ABAS.map(([k, rotulo]) => (
          <Link key={k} href={qs({ aba: k })} aria-current={aba === k ? "page" : undefined}
            className={`whitespace-nowrap rounded-md border px-4 py-2 text-sm ${aba === k ? "border-quadra-600 font-semibold text-quadra-600" : "border-linha bg-white"}`}>{rotulo}</Link>
        ))}
      </nav>

      <section className="rounded-lg border border-linha bg-white p-4">{conteudo}</section>
    </div>
  );
}
