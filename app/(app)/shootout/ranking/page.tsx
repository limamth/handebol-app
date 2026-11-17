import Link from "next/link";
import { obterPerfil } from "@/lib/sessao";
import { hojeChave } from "@/lib/periodo";
import { CartaoIndicador } from "@/components/dashboard/CartaoIndicador";
import { BarrasUltimas } from "@/components/shootout/BarrasUltimas";
import { MINIMO, buscarBatidas, carregarAtletas, carregarFases, carregarGoleiros, escolherFase, estiloDaBatida, fmtPct, rankingBatedores, resumir, rotuloFase } from "@/lib/shootout";

const ESTILOS = [["geral", "Geral"], ["baliza", "Contra goleiros de Baliza"], ["saida", "Contra goleiros de Saída"]] as const;
const CORES_POSICAO = ["bg-bola-500 text-white", "bg-slate-500 text-white", "bg-amber-700 text-white"];

export default async function Ranking({ searchParams }: { searchParams: { fase?: string; estilo?: string } }) {
  const { supabase } = await obterPerfil();
  const hoje = hojeChave();
  const [fases, atletas, goleiros] = await Promise.all([carregarFases(supabase), carregarAtletas(supabase), carregarGoleiros(supabase)]);
  const fase = escolherFase(fases, searchParams.fase, hoje);
  const estilo = ESTILOS.some(([k]) => k === searchParams.estilo) ? searchParams.estilo! : "geral";

  const todas = await buscarBatidas(supabase, { fase });
  const batidas = estilo === "geral" ? todas : todas.filter((b) => estiloDaBatida(b, goleiros) === estilo);
  const r = resumir(batidas);
  const sessoes = new Set(batidas.map((b) => b.sessaoId)).size;
  const { linhas, minimo, media } = rankingBatedores(batidas, atletas);
  const top = linhas.filter((l) => l.qualificado).slice(0, 5);
  const link = (e: string) => `/shootout/ranking?fase=${fase}&estilo=${e}`;

  return (
    <div className="space-y-5">
      <form action="/shootout/ranking" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="estilo" value={estilo} />
        <label className="block text-sm font-medium">Fase de treinamento
          <select name="fase" defaultValue={fase} className="mt-1 block rounded-md border border-linha bg-white px-3 py-2.5">
            <option value="todas">Todas as fases</option>
            {fases.map((f) => <option key={f.id} value={f.id}>{rotuloFase(f)}</option>)}
            <option value="sem">Sem fase</option>
          </select>
        </label>
        <button className="rounded-md border border-linha px-4 py-2.5 text-sm hover:bg-fundo">Aplicar</button>
      </form>

      <nav aria-label="Estilo do goleiro" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {ESTILOS.map(([k, rotulo]) => (
          <Link key={k} href={link(k)} aria-current={estilo === k ? "page" : undefined}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm ${estilo === k ? "border-quadra-900 bg-quadra-900 text-white" : "border-linha bg-white"}`}>{rotulo}</Link>
        ))}
      </nav>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Resumo">
        <CartaoIndicador rotulo="Sessões" valor={String(sessoes)} />
        <CartaoIndicador rotulo="Batidas" valor={String(r.total)} />
        <CartaoIndicador rotulo="Convertidas" valor={String(r.convertidas)} />
        <CartaoIndicador rotulo="Aproveitamento" valor={fmtPct(r.pct)} />
      </section>

      <section aria-label="Top 5" className="space-y-3">
        <h2 className="font-titulo text-2xl font-semibold">Top 5 para Shoot-out</h2>
        <p className="text-sm text-suave">
          Só entra quem tem pelo menos <strong>{minimo} batidas</strong>: {Math.round(MINIMO.fracaoDaMedia * 100)}% da média de {media.toFixed(1).replace(".", ",")} batidas por atleta neste filtro, com piso de {MINIMO.piso}.
          O mínimo acompanha a fase: começa baixo e sobe conforme as batidas acumulam.
        </p>
        {top.length === 0 ? (
          <p className="rounded-lg border border-dashed border-linha bg-white p-5 text-suave">Ainda não há atleta com o mínimo de {minimo} batidas neste filtro.</p>
        ) : (
          <ol className="space-y-3">
            {top.map((l, i) => (
              <li key={l.id} className="rounded-lg border border-linha bg-white p-4">
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md font-titulo text-xl font-bold ${CORES_POSICAO[i] ?? "bg-quadra-900 text-white"}`}>{i + 1}º</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{l.nome}</p>
                    <p className="text-xs text-suave">{l.posicao ?? "Posição não informada"}</p>
                  </div>
                  <div className="text-right"><p className="font-titulo text-3xl font-bold">{fmtPct(l.pct)}</p><p className="text-xs text-suave">{l.convertidas}/{l.total} convertidas</p></div>
                </div>
                <BarrasUltimas resultados={l.ultimas} />
              </li>
            ))}
          </ol>
        )}
        <p className="text-xs text-suave">As cinco barras mostram as últimas 5 batidas de cada atleta, da mais antiga (esquerda) para a mais recente (direita): verde = convertido, vermelho = perdido.</p>
      </section>

      <section aria-label="Ranking completo" className="space-y-2">
        <h2 className="font-titulo text-2xl font-semibold">Ranking completo</h2>
        {linhas.length === 0 ? <p className="text-suave">Nenhuma batida neste filtro.</p> : (
          <ol className="space-y-2">
            {linhas.map((l, i) => (
              <li key={l.id} className={`flex items-center justify-between gap-3 rounded-md px-4 py-3 ${l.qualificado ? "bg-fundo" : "border border-dashed border-linha"}`}>
                <div className="min-w-0">
                  <p className="truncate font-medium">{l.qualificado ? `${i + 1}º ` : ""}{l.nome}{l.posicao ? <span className="ml-2 text-xs font-normal text-suave">{l.posicao}</span> : null}</p>
                  {!l.qualificado && <p className="text-xs text-suave">{l.total} de {minimo} batidas para entrar no ranking</p>}
                </div>
                <div className="text-right"><p className="font-titulo text-xl font-bold">{fmtPct(l.pct)}</p><p className="text-xs text-suave">{l.convertidas}/{l.total}</p></div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
