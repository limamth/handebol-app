"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Play, Trophy, Target, Shield, Users } from "lucide-react";
import {
  ROTULO_RESULTADO,
  ROTULO_TIPO,
  ROTULO_ZONA,
  TIPOS_ARREMESSO_ANALISE,
  calcularEstatisticasAtletas,
  calcularEstatisticasLado,
  calcularSetsVencidos,
  obterNomeEquipeA,
  obterNomeEquipeB,
  type AcaoPartida,
  type PartidaAnalise,
} from "@/lib/analise-jogo";
import { ROTULO_QUADRANTE, type QuadranteBaliza } from "@/lib/scouting";
import { reabrirPartidaAnalise } from "@/app/(app)/analise-jogo/actions";

interface PainelEstatisticasPartidaProps {
  partida: PartidaAnalise;
  acoes: AcaoPartida[];
  podeEditar: boolean;
}

export function PainelEstatisticasPartida({
  partida,
  acoes,
  podeEditar,
}: PainelEstatisticasPartidaProps) {
  const [filtroSet, setFiltroSet] = useState<"todos" | 1 | 2 | 3>("todos");
  const [abaAtletas, setAbaAtletas] = useState<"nos" | "adversario">("nos");

  const nomeNos = obterNomeEquipeA(partida);
  const nomeAdv = obterNomeEquipeB(partida);
  const sets = calcularSetsVencidos(partida);

  const acoesFiltradas =
    filtroSet === "todos" ? acoes : acoes.filter((a) => a.set_numero === filtroSet);

  const statsNos = calcularEstatisticasLado(acoesFiltradas, "nos");
  const statsAdv = calcularEstatisticasLado(acoesFiltradas, "adversario");
  const atletasStats = calcularEstatisticasAtletas(acoesFiltradas).filter(
    (a) => a.lado === abaAtletas
  );

  const exportarCsv = () => {
    let csv = "Nº;Set;Equipe;Atleta;Resultado;Tipo;Alvo;Zona;Tempo;Placar Nos;Placar Adv\n";
    acoesFiltradas.forEach((a, i) => {
      const equipe = a.lado === "nos" ? nomeNos : nomeAdv;
      const setLabel = a.set_numero === 3 ? "Shoot-out" : `${a.set_numero}º Set`;
      csv += `${i + 1};"${setLabel}";"${equipe}";"${a.atleta_nome}";"${ROTULO_RESULTADO[a.resultado]}";"${
        ROTULO_TIPO[a.tipo] ?? a.tipo
      }";"${a.atleta_alvo_nome ?? ""}";"${a.zona ? ROTULO_ZONA[a.zona] ?? a.zona : ""}";"${a.faixa_tempo}";${
        a.placar_nos_momento
      };${a.placar_adv_momento}\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `estatisticas_${nomeNos}_vs_${nomeAdv}_${partida.data_partida}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/analise-jogo"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-suave hover:text-tinta"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para partidas
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportarCsv}
            className="inline-flex items-center gap-1.5 rounded-md border border-linha bg-white px-3 py-1.5 text-xs font-semibold text-tinta shadow-sm hover:bg-fundo"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar Excel (CSV)
          </button>

          {podeEditar && partida.status === "ao_vivo" && (
            <Link
              href={`/analise-jogo/${partida.id}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-bola-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
            >
              <Play className="h-3.5 w-3.5" />
              Voltar para Registro ao Vivo
            </Link>
          )}

          {podeEditar && partida.status === "finalizada" && (
            <form action={reabrirPartidaAnalise.bind(null, partida.id)}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md border border-linha bg-white px-3 py-1.5 text-xs font-semibold text-tinta hover:bg-fundo"
              >
                Reabrir Análise ao Vivo
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Cabeçalho do Placar */}
      <div className="rounded-xl border border-linha bg-quadra-900 p-5 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/70 pb-3 border-b border-white/15">
          <span>
            {partida.competicao ? `${partida.competicao} · ` : ""}
            {partida.fase ?? ""} · {partida.data_partida}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 font-bold uppercase ${
              partida.status === "ao_vivo" ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
            }`}
          >
            {partida.status === "ao_vivo" ? "Ao Vivo" : "Finalizada"}
          </span>
        </div>

        <div className="grid grid-cols-3 items-center gap-3 pt-4 text-center">
          <div>
            <p className="font-titulo text-xl sm:text-2xl font-bold">{nomeNos}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-bola-300 font-semibold">SETS</p>
            <p className="font-titulo text-4xl font-extrabold my-1">
              {sets.nos} <span className="text-white/40 text-2xl">×</span> {sets.adv}
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-xs text-white/80">
              <span>1º Set: {partida.set1_nos}×{partida.set1_adv}</span>
              <span>2º Set: {partida.set2_nos}×{partida.set2_adv}</span>
              {(partida.shootout_nos > 0 || partida.shootout_adv > 0) && (
                <span>SO: {partida.shootout_nos}×{partida.shootout_adv}</span>
              )}
            </div>
          </div>
          <div>
            <p className="font-titulo text-xl sm:text-2xl font-bold">{nomeAdv}</p>
          </div>
        </div>
      </div>

      {/* Filtro de Set */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { k: "todos", r: "Jogo Inteiro" },
          { k: 1, r: "1º Set" },
          { k: 2, r: "2º Set" },
          { k: 3, r: "Shoot-out" },
        ].map((aba) => (
          <button
            key={String(aba.k)}
            type="button"
            onClick={() => setFiltroSet(aba.k as any)}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
              filtroSet === aba.k
                ? "bg-bola-500 text-white shadow-sm"
                : "border border-linha bg-white text-suave hover:text-tinta"
            }`}
          >
            {aba.r}
          </button>
        ))}
      </div>

      {/* Resumo Comparativo das Equipes */}
      <div className="grid gap-4 md:grid-cols-2">
        {[
          { titulo: nomeNos, s: statsNos, cor: "border-quadra-700" },
          { titulo: nomeAdv, s: statsAdv, cor: "border-linha" },
        ].map((lado) => (
          <div key={lado.titulo} className={`rounded-xl border-2 ${lado.cor} bg-white p-5 shadow-sm space-y-4`}>
            <div className="flex items-center justify-between border-b border-linha pb-2">
              <h3 className="font-titulo text-lg font-bold text-tinta flex items-center gap-2">
                <Trophy className="h-4 w-4 text-bola-500" />
                {lado.titulo}
              </h3>
              <span className="rounded bg-bola-100 px-2.5 py-0.5 text-xs font-bold text-bola-800">
                {lado.s.pontos} pts
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
              <div className="rounded-lg bg-fundo p-2.5">
                <p className="text-[11px] text-suave">Gols</p>
                <p className="font-titulo text-xl font-bold text-tinta">{lado.s.golsQtd}</p>
              </div>
              <div className="rounded-lg bg-fundo p-2.5">
                <p className="text-[11px] text-suave">Arremessos</p>
                <p className="font-titulo text-xl font-bold text-tinta">{lado.s.arremessosQtd}</p>
              </div>
              <div className="rounded-lg bg-fundo p-2.5">
                <p className="text-[11px] text-suave">% Arrem.</p>
                <p className="font-titulo text-xl font-bold text-emerald-600">{lado.s.pctArremessos}%</p>
              </div>
              <div className="rounded-lg bg-fundo p-2.5">
                <p className="text-[11px] text-suave">Turnovers</p>
                <p className="font-titulo text-xl font-bold text-purple-700">{lado.s.turnoversQtd}</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-quadra-50 px-3 py-2 text-xs">
              <span className="font-semibold text-quadra-900">
                Aproveitamento Geral (Gols / {lado.s.possesQtd} posses)
              </span>
              <span className="font-titulo text-base font-bold text-quadra-800">{lado.s.pctGeral}%</span>
            </div>

            {/* Ranking por Tipo de Arremesso */}
            <div>
              <p className="text-xs font-semibold text-suave uppercase mb-2">Por Tipo de Arremesso (Melhor → Pior)</p>
              <div className="space-y-1.5">
                {lado.s.porTipo.map((t) => (
                  <div key={t.tipo} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-tinta w-24">{t.rotulo}</span>
                    <div className="flex-1 mx-2 h-2 overflow-hidden rounded-full bg-cinza-100">
                      <div
                        className="h-full bg-bola-500 rounded-full"
                        style={{ width: `${t.pct}%` }}
                      />
                    </div>
                    <span className="font-mono text-suave w-24 text-right">
                      {t.gols}/{t.arremessos} ({t.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Aproveitamento por Zona */}
      <div className="rounded-xl border border-linha bg-white p-5 shadow-sm space-y-4">
        <h3 className="font-titulo text-lg font-bold text-tinta flex items-center gap-2">
          <Target className="h-5 w-5 text-bola-500" />
          Aproveitamento por Zona de Ataque
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            { titulo: nomeNos, zonas: statsNos.porZona },
            { titulo: nomeAdv, zonas: statsAdv.porZona },
          ].map((eq) => (
            <div key={eq.titulo} className="space-y-2">
              <p className="text-xs font-bold uppercase text-suave">{eq.titulo}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {eq.zonas.map((z) => (
                  <div key={z.zona} className="rounded-lg border border-linha bg-fundo p-2.5 text-center">
                    <p className="text-[11px] font-semibold text-tinta truncate">{z.rotulo}</p>
                    <p className="font-titulo text-lg font-bold text-bola-600 mt-0.5">{z.pct}%</p>
                    <p className="text-[10px] text-suave">
                      {z.gols}/{z.arremessos} ({z.pontos} pts)
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desempenho por Atleta */}
      <div className="rounded-xl border border-linha bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-titulo text-lg font-bold text-tinta flex items-center gap-2">
            <Users className="h-5 w-5 text-quadra-700" />
            Desempenho por Atleta
          </h3>

          <div className="inline-flex rounded-md border border-linha bg-fundo p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setAbaAtletas("nos")}
              className={`rounded px-3 py-1 font-semibold ${
                abaAtletas === "nos" ? "bg-white text-tinta shadow-sm" : "text-suave"
              }`}
            >
              {nomeNos}
            </button>
            <button
              type="button"
              onClick={() => setAbaAtletas("adversario")}
              className={`rounded px-3 py-1 font-semibold ${
                abaAtletas === "adversario" ? "bg-white text-tinta shadow-sm" : "text-suave"
              }`}
            >
              {nomeAdv}
            </button>
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
                <th className="px-2 py-2.5 text-center">Bloq. Sof.</th>
                <th className="px-2 py-2.5 text-center">Turnovers</th>
                <th className="px-2 py-2.5 text-center">Block Def</th>
                <th className="px-2 py-2.5 text-center">Roubo Def</th>
                <th className="px-2 py-2.5 text-center">Falta Atq</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {atletasStats.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-6 text-center text-suave">
                    Sem ações registradas para esta equipe neste filtro.
                  </td>
                </tr>
              ) : (
                atletasStats.map((a) => (
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
                    <td className="px-2 py-2.5 text-center">{a.bloqueadoSofrido || "—"}</td>
                    <td className="px-2 py-2.5 text-center text-purple-700 font-semibold">
                      {a.turnovers || "—"}
                    </td>
                    <td className="px-2 py-2.5 text-center text-emerald-700 font-semibold">
                      {a.blockDef || "—"}
                    </td>
                    <td className="px-2 py-2.5 text-center text-emerald-700 font-semibold">
                      {a.rouboDef || "—"}
                    </td>
                    <td className="px-2 py-2.5 text-center">{a.faltaAtaqueDef || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabela Cronológica de Ações */}
      <div className="rounded-xl border border-linha bg-white p-5 shadow-sm space-y-3">
        <h3 className="font-titulo text-lg font-bold text-tinta flex items-center gap-2">
          <Shield className="h-5 w-5 text-suave" />
          Ações Registradas ({acoesFiltradas.length})
        </h3>

        <div className="max-h-96 overflow-auto rounded-lg border border-linha">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 border-b border-linha bg-fundo text-suave uppercase">
              <tr>
                <th className="px-3 py-2">Nº</th>
                <th className="px-3 py-2">Set</th>
                <th className="px-3 py-2">Equipe</th>
                <th className="px-3 py-2">Atleta</th>
                <th className="px-3 py-2">Resultado</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Zona</th>
                <th className="px-3 py-2">Tempo</th>
                <th className="px-3 py-2">Placar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {acoesFiltradas.map((a, i) => (
                <tr key={a.id} className="hover:bg-fundo/70">
                  <td className="px-3 py-2 text-suave">{i + 1}</td>
                  <td className="px-3 py-2">{a.set_numero === 3 ? "SO" : `${a.set_numero}º`}</td>
                  <td className="px-3 py-2 font-medium">
                    {a.lado === "nos" ? nomeNos : nomeAdv}
                    {a.resultado === "acao_defensiva" && (
                      <span className="block text-[10px] text-quadra-700">
                        Def: {a.lado === "nos" ? nomeAdv : nomeNos}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {a.atleta_nome}
                    {a.atleta_alvo_nome && (
                      <span className="block text-[10px] text-suave">vs {a.atleta_alvo_nome}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-semibold">{ROTULO_RESULTADO[a.resultado]}</td>
                  <td className="px-3 py-2">{ROTULO_TIPO[a.tipo] ?? a.tipo}</td>
                  <td className="px-3 py-2">
                    {a.zona ? ROTULO_ZONA[a.zona] ?? a.zona : "—"}
                    {a.quadrante_baliza && (
                      <span className="block text-[10px] text-bola-600 font-semibold">
                        Gol: {ROTULO_QUADRANTE[a.quadrante_baliza as QuadranteBaliza] ?? a.quadrante_baliza}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{a.faixa_tempo}</td>
                  <td className="px-3 py-2 font-mono font-bold">
                    {a.placar_nos_momento}×{a.placar_adv_momento}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
