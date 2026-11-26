import Link from "next/link";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { exigirModuloAtivo } from "@/lib/configuracoes";
import { podeVer } from "@/lib/permissions";
import {
  TIPOS_ARREMESSO_ANALISE,
  calcularEstatisticasAtletas,
  calcularEstatisticasLado,
  calcularSetsVencidos,
  obterNomeEquipeA,
  obterNomeEquipeB,
  type AcaoPartida,
  type EquipeAnalise,
  type PartidaAnalise,
} from "@/lib/analise-jogo";
import { ArrowLeft, Trophy, Users } from "lucide-react";

export const metadata = {
  title: "Estatísticas Acumuladas | Handebol Hub",
};

export default async function PaginaAcumulados({
  searchParams,
}: {
  searchParams: { equipa?: string; lado?: "nos" | "adversario" };
}) {
  await exigirModuloAtivo("analise_jogo");
  const { supabase, perfil } = await obterPerfil();

  if (!podeVer(perfil.papel, "analise_jogo")) {
    redirect("/dashboard");
  }

  const [{ data: equipas }, { data: partidasRaw }] = await Promise.all([
    supabase.from("equipes_analise").select("id, nome, tipo").eq("clube_id", perfil.clube_id).order("nome"),
    supabase
      .from("partidas_analise")
      .select("*, equipas(id, nome)")
      .eq("clube_id", perfil.clube_id)
      .order("data_partida", { ascending: false }),
  ]);

  const partidas = ((partidasRaw ?? []) as PartidaAnalise[]).filter((p) =>
    searchParams.equipa
      ? p.equipe_a_id === searchParams.equipa || p.equipe_b_id === searchParams.equipa || p.equipa_id === searchParams.equipa
      : true
  );

  const partidaIds = partidas.map((p) => p.id);
  const { data: acoesRaw } =
    partidaIds.length > 0
      ? await supabase
          .from("acoes_partida")
          .select("*")
          .eq("clube_id", perfil.clube_id)
          .in("partida_id", partidaIds)
      : { data: [] };

  const acoes = (acoesRaw ?? []) as AcaoPartida[];

  // Desempenho Geral (Vitórias / Derrotas)
  let vitorias = 0;
  let derrotas = 0;
  for (const p of partidas) {
    const sets = calcularSetsVencidos(p);
    if (sets.nos > sets.adv) vitorias++;
    else if (sets.adv > sets.nos) derrotas++;
  }

  const ladoAtivo = searchParams.lado === "adversario" ? "adversario" : "nos";
  const statsResumo = calcularEstatisticasLado(acoes, ladoAtivo);
  const statsAtletas = calcularEstatisticasAtletas(acoes).filter((a) => a.lado === ladoAtivo);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/analise-jogo"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-suave hover:text-tinta"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Análise de Jogo
        </Link>
      </div>

      <header className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-quadra-900 text-white shadow-sm">
          <Trophy className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-titulo text-3xl font-bold text-tinta">Estatísticas Acumuladas</h1>
          <p className="text-sm text-suave">
            Desempenho consolidado de todas as partidas analisadas.
          </p>
        </div>
      </header>

      {/* Filtro por Equipe */}
      {(equipas ?? []).length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/analise-jogo/acumulados?lado=${ladoAtivo}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              !searchParams.equipa
                ? "bg-quadra-900 text-white"
                : "border border-linha bg-white text-suave hover:text-tinta"
            }`}
          >
            Todas as Equipes
          </Link>
          {(equipas ?? []).map((e: any) => (
            <Link
              key={e.id}
              href={`/analise-jogo/acumulados?equipa=${e.id}&lado=${ladoAtivo}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                searchParams.equipa === e.id
                  ? "bg-quadra-900 text-white"
                  : "border border-linha bg-white text-suave hover:text-tinta"
              }`}
            >
              {e.nome}
            </Link>
          ))}
        </div>
      )}

      {/* Desempenho Geral */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-linha bg-white p-5 shadow-sm text-center">
          <p className="text-xs font-semibold uppercase text-suave">Partidas</p>
          <p className="font-titulo text-3xl font-extrabold text-tinta mt-1">{partidas.length}</p>
        </div>
        <div className="rounded-xl border border-linha bg-white p-5 shadow-sm text-center">
          <p className="text-xs font-semibold uppercase text-suave">Vitórias</p>
          <p className="font-titulo text-3xl font-extrabold text-emerald-600 mt-1">{vitorias}</p>
        </div>
        <div className="rounded-xl border border-linha bg-white p-5 shadow-sm text-center">
          <p className="text-xs font-semibold uppercase text-suave">Derrotas</p>
          <p className="font-titulo text-3xl font-extrabold text-rose-600 mt-1">{derrotas}</p>
        </div>
      </div>

      {/* Lista de Resultados */}
      <div className="rounded-xl border border-linha bg-white p-5 shadow-sm space-y-3">
        <h2 className="font-titulo text-lg font-bold text-tinta">Resultados</h2>
        {partidas.length === 0 ? (
          <p className="text-sm text-suave">Nenhuma partida encontrada.</p>
        ) : (
          <div className="divide-y divide-linha">
            {partidas.map((p) => {
              const sets = calcularSetsVencidos(p);
              const venceu = sets.nos > sets.adv;
              const perdeu = sets.adv > sets.nos;

              return (
                <Link
                  key={p.id}
                  href={`/analise-jogo/${p.id}/estatisticas`}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-fundo px-2 rounded-lg transition"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-7 w-14 items-center justify-center rounded font-bold text-xs ${
                        venceu
                          ? "bg-emerald-100 text-emerald-800"
                          : perdeu
                          ? "bg-rose-100 text-rose-800"
                          : "bg-cinza-100 text-tinta"
                      }`}
                    >
                      {venceu ? "V" : perdeu ? "D" : "E"} {sets.nos}×{sets.adv}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-tinta">
                        {obterNomeEquipeA(p)} vs {obterNomeEquipeB(p)}
                      </p>
                      <p className="text-xs text-suave">
                        {p.competicao ? `${p.competicao} · ` : ""}
                        {p.fase ?? ""} · {p.data_partida}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-suave">
                    1º: {p.set1_nos}×{p.set1_adv} | 2º: {p.set2_nos}×{p.set2_adv}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Totais do Elenco + Por Atleta */}
      <div className="rounded-xl border border-linha bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-titulo text-lg font-bold text-tinta flex items-center gap-2">
            <Users className="h-5 w-5 text-bola-500" />
            Consolidado por Atleta
          </h2>

          <div className="inline-flex rounded-md border border-linha bg-fundo p-0.5 text-xs">
            <Link
              href={`/analise-jogo/acumulados?${searchParams.equipa ? `equipa=${searchParams.equipa}&` : ""}lado=nos`}
              className={`rounded px-3 py-1 font-semibold ${
                ladoAtivo === "nos" ? "bg-white text-tinta shadow-sm" : "text-suave"
              }`}
            >
              Nossas Equipes
            </Link>
            <Link
              href={`/analise-jogo/acumulados?${searchParams.equipa ? `equipa=${searchParams.equipa}&` : ""}lado=adversario`}
              className={`rounded px-3 py-1 font-semibold ${
                ladoAtivo === "adversario" ? "bg-white text-tinta shadow-sm" : "text-suave"
              }`}
            >
              Adversários
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
          <div className="rounded-lg bg-fundo p-3">
            <p className="text-[11px] text-suave">Gols</p>
            <p className="font-titulo text-xl font-bold text-tinta">{statsResumo.golsQtd}</p>
          </div>
          <div className="rounded-lg bg-fundo p-3">
            <p className="text-[11px] text-suave">Arremessos</p>
            <p className="font-titulo text-xl font-bold text-tinta">{statsResumo.arremessosQtd}</p>
          </div>
          <div className="rounded-lg bg-fundo p-3">
            <p className="text-[11px] text-suave">Aproveitamento</p>
            <p className="font-titulo text-xl font-bold text-emerald-600">{statsResumo.pctArremessos}%</p>
          </div>
          <div className="rounded-lg bg-fundo p-3">
            <p className="text-[11px] text-suave">Turnovers</p>
            <p className="font-titulo text-xl font-bold text-purple-700">{statsResumo.turnoversQtd}</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-linha">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-linha bg-fundo text-suave uppercase">
              <tr>
                <th className="px-3 py-2.5">Atleta</th>
                <th className="px-2 py-2.5 text-center">Pts</th>
                <th className="px-2 py-2.5 text-center">Gols / Arr (%)</th>
                {TIPOS_ARREMESSO_ANALISE.map((t) => (
                  <th key={t.chave} className="px-2 py-2.5 text-center">
                    {t.rotulo}
                  </th>
                ))}
                <th className="px-2 py-2.5 text-center">TO</th>
                <th className="px-2 py-2.5 text-center">Def (Blk/Roubo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {statsAtletas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-suave">
                    Sem estatísticas acumuladas ainda.
                  </td>
                </tr>
              ) : (
                statsAtletas.map((a) => (
                  <tr key={a.nome} className="hover:bg-fundo/70">
                    <td className="px-3 py-2.5 font-semibold text-tinta">{a.nome}</td>
                    <td className="px-2 py-2.5 text-center font-bold text-bola-600">{a.pontos}</td>
                    <td className="px-2 py-2.5 text-center font-mono">
                      {a.golsQtd}/{a.arremessosQtd} ({a.pctArremesso}%)
                    </td>
                    {TIPOS_ARREMESSO_ANALISE.map((t) => {
                      const d = a.porTipo[t.chave];
                      return (
                        <td key={t.chave} className="px-2 py-2.5 text-center font-mono text-suave">
                          {d ? `${d.gols}/${d.arr}` : "—"}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2.5 text-center text-purple-700 font-semibold">
                      {a.turnovers || "—"}
                    </td>
                    <td className="px-2 py-2.5 text-center text-emerald-700 font-semibold">
                      {a.blockDef + a.rouboDef + a.faltaAtaqueDef || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
