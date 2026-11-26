"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Download,
  Flag,
  List,
  RotateCcw,
  Trash2,
  Undo2,
  ChevronLeft,
} from "lucide-react";
import {
  FAIXAS_TEMPO,
  RESULTADOS_ACAO,
  ROTULO_RESULTADO,
  ROTULO_TIPO,
  ROTULO_ZONA,
  TIPOS_ACAO_DEFENSIVA,
  TIPOS_ARREMESSO_ANALISE,
  TIPOS_TURNOVER,
  ZONAS_ATAQUE,
  calcularSetsVencidos,
  obterNomeEquipeA,
  obterNomeEquipeB,
  type AcaoPartida,
  type PartidaAnalise,
  type ResultadoAcao,
} from "@/lib/analise-jogo";
import { ROTULO_QUADRANTE, type QuadranteBaliza } from "@/lib/scouting";
import { BalizaInterativa } from "@/components/scouting/BalizaInterativa";
import {
  excluirAcaoPartida,
  finalizarPartidaAnalise,
  registrarAcaoPartida,
} from "@/app/(app)/analise-jogo/actions";

export interface AtletaSimples {
  id: string | null;
  nome: string;
  numero?: number | null;
}

interface PainelAoVivoProps {
  partidaInicial: PartidaAnalise;
  acoesIniciais: AcaoPartida[];
  atletasNos: AtletaSimples[];
  atletasAdv: AtletaSimples[];
}

export function PainelAoVivo({
  partidaInicial,
  acoesIniciais,
  atletasNos,
  atletasAdv,
}: PainelAoVivoProps) {
  const [partida, setPartida] = useState(partidaInicial);
  const [acoes, setAcoes] = useState<AcaoPartida[]>(acoesIniciais);
  const [setAtual, setSetAtual] = useState<number>(1);
  const [verAcoes, setVerAcoes] = useState(false);
  const [abaAcoes, setAbaAcoes] = useState<"todas" | "nos" | "adversario">("todas");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Estado do Wizard (Passos 1 a 8)
  const [passo, setPasso] = useState<number>(1);
  const [lado, setLado] = useState<"nos" | "adversario" | null>(null);
  const [resultado, setResultado] = useState<ResultadoAcao | null>(null);
  const [atletaSelecionado, setAtletaSelecionado] = useState<AtletaSimples | null>(null);
  const [tipo, setTipo] = useState<string | null>(null);
  const [atletaAlvo, setAtletaAlvo] = useState<AtletaSimples | null>(null);
  const [zona, setZona] = useState<string | null>(null);
  const [quadranteBaliza, setQuadranteBaliza] = useState<QuadranteBaliza | null>(null);
  const [atletaCustomNome, setAtletaCustomNome] = useState("");

  const nomeNos = obterNomeEquipeA(partida);
  const nomeAdv = obterNomeEquipeB(partida);

  const setsVencidos = calcularSetsVencidos(partida);
  const placarAtualNos =
    setAtual === 1 ? partida.set1_nos : setAtual === 2 ? partida.set2_nos : partida.shootout_nos;
  const placarAtualAdv =
    setAtual === 1 ? partida.set1_adv : setAtual === 2 ? partida.set2_adv : partida.shootout_adv;

  const recomecar = () => {
    setPasso(1);
    setLado(null);
    setResultado(null);
    setAtletaSelecionado(null);
    setTipo(null);
    setAtletaAlvo(null);
    setZona(null);
    setQuadranteBaliza(null);
    setAtletaCustomNome("");
  };

  const voltarPasso = () => {
    if (passo === 1) return;
    if (passo === 2) {
      setLado(null);
      setPasso(1);
    } else if (passo === 3) {
      setResultado(null);
      setPasso(2);
    } else if (passo === 4) {
      setAtletaSelecionado(null);
      setPasso(3);
    } else if (passo === 5 || passo === 6) {
      setTipo(null);
      setPasso(4);
    } else if (passo === 7) {
      if (resultado === "acao_defensiva" && tipo === "block") {
        setAtletaAlvo(null);
        setPasso(5);
      } else {
        setTipo(null);
        setPasso(4);
      }
    } else if (passo === 8) {
      setZona(null);
      setPasso(7);
    } else if (passo === 9) {
      if (resultado === "turnover" || (resultado === "acao_defensiva" && (tipo === "desvio" || tipo === "falta_ataque"))) {
        setTipo(null);
        setPasso(4);
      } else if (resultado === "acao_defensiva" && tipo === "roubo") {
        setAtletaAlvo(null);
        setPasso(6);
      } else if (resultado === "acao_defensiva" && tipo === "block") {
        setZona(null);
        setPasso(7);
      } else {
        setQuadranteBaliza(null);
        setPasso(8);
      }
    }
  };

  const escolherLado = (l: "nos" | "adversario") => {
    setLado(l);
    setPasso(2);
  };

  const escolherResultado = (r: ResultadoAcao) => {
    setResultado(r);
    setPasso(3);
  };

  const escolherAtleta = (a: AtletaSimples) => {
    setAtletaSelecionado(a);
    setPasso(4);
  };

  const escolherTipo = (t: string) => {
    setTipo(t);
    if (resultado === "acao_defensiva") {
      if (t === "block") {
        setPasso(5); // Qual atacante foi bloqueado?
      } else if (t === "roubo") {
        setPasso(6); // Qual atleta perdeu a bola?
      } else {
        // desvio ou falta_ataque pula zona e vai pro tempo
        setPasso(9);
      }
    } else if (resultado === "turnover") {
      // Turnover pula zona e vai direto para tempo
      setPasso(9);
    } else {
      // gol, fora, defendido -> vai para Zona (Passo 7)
      setPasso(7);
    }
  };

  const escolherAlvoBlock = (a: AtletaSimples | null) => {
    setAtletaAlvo(a);
    setPasso(7); // Block também marca zona
  };

  const escolherAlvoRoubo = (a: AtletaSimples | null) => {
    setAtletaAlvo(a);
    setPasso(9); // Roubo pula zona e vai para tempo
  };

  const escolherZona = (z: string) => {
    setZona(z);
    if (resultado === "acao_defensiva") {
      setPasso(9); // Block vai direto pro tempo
    } else {
      setPasso(8); // Arremessos vão para seleção da região do gol
    }
  };

  const escolherQuadrante = (q: QuadranteBaliza | null) => {
    setQuadranteBaliza(q);
    setPasso(9);
  };

  const finalizarLance = (faixaTempo: string) => {
    if (!lado || !resultado || !atletaSelecionado || !tipo) return;

    startTransition(async () => {
      try {
        const ehDefensiva = resultado === "acao_defensiva";
        const ladoExecutor = ehDefensiva ? (lado === "nos" ? "adversario" : "nos") : lado;
        const res = await registrarAcaoPartida(partida.id, {
          setNumero: setAtual,
          lado,
          resultado,
          atletaId: ladoExecutor === "nos" ? atletaSelecionado.id : null,
          atletaAdversarioId: ladoExecutor === "adversario" ? atletaSelecionado.id : null,
          atletaNome: atletaSelecionado.numero
            ? `#${atletaSelecionado.numero} ${atletaSelecionado.nome}`
            : atletaSelecionado.nome,
          tipo,
          atletaAlvoId: atletaAlvo?.id ?? null,
          atletaAlvoNome: atletaAlvo
            ? atletaAlvo.numero
              ? `#${atletaAlvo.numero} ${atletaAlvo.nome}`
              : atletaAlvo.nome
            : null,
          zona,
          quadranteBaliza,
          faixaTempo,
        });

        setAcoes(res.acoes);
        setPartida((prev) => ({ ...prev, ...res.placares }));
        setFeedback(
          `Registrado: ${lado === "nos" ? nomeNos : nomeAdv} · ${ROTULO_RESULTADO[resultado]} (${ROTULO_TIPO[tipo] ?? tipo})`
        );
        setTimeout(() => setFeedback(null), 3000);
        recomecar();
      } catch (err: any) {
        alert("Erro ao registrar ação: " + err.message);
      }
    });
  };

  const handleExcluirAcao = (acaoId: string) => {
    startTransition(async () => {
      try {
        const res = await excluirAcaoPartida(partida.id, acaoId);
        setAcoes(res.acoes);
        setPartida((prev) => ({ ...prev, ...res.placares }));
        setFeedback("Ação removida e placar recalculado.");
        setTimeout(() => setFeedback(null), 2500);
      } catch (err: any) {
        alert("Erro ao excluir: " + err.message);
      }
    });
  };

  const exportarCsv = () => {
    let csv = "Nº;Set;Equipe;Atleta;Resultado;Tipo;Alvo;Zona;Tempo;Placar Nos;Placar Adv\n";
    acoes.forEach((a, i) => {
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
    link.download = `analise_${nomeNos}_vs_${nomeAdv}_${partida.data_partida}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const listaAtletasAtual = lado === "nos" ? atletasNos : atletasAdv;
  const listaAtletasOposto = lado === "nos" ? atletasAdv : atletasNos;
  const ultimaAcao = acoes.length > 0 ? acoes[acoes.length - 1] : null;

  const acoesFiltradas = acoes.filter((a) => {
    if (abaAcoes === "nos") return a.lado === "nos";
    if (abaAcoes === "adversario") return a.lado === "adversario";
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Barra Superior */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-linha bg-white px-4 py-3 shadow-sm">
        <Link
          href="/analise-jogo"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-suave hover:text-tinta"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/analise-jogo/${partida.id}/estatisticas`}
            className="inline-flex items-center gap-1.5 rounded-md border border-linha bg-fundo px-3 py-1.5 text-xs font-semibold text-tinta hover:bg-cinza-100"
          >
            <BarChart3 className="h-4 w-4 text-quadra-600" />
            Stats ao Vivo
          </Link>

          <button
            type="button"
            onClick={() => setVerAcoes(!verAcoes)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
              verAcoes
                ? "border-bola-500 bg-bola-50 text-bola-700"
                : "border-linha bg-white text-tinta hover:bg-fundo"
            }`}
          >
            <List className="h-4 w-4" />
            {verAcoes ? "Ocultar Ações" : `Ver Ações (${acoes.length})`}
          </button>

          {partida.status === "ao_vivo" && (
            <form
              action={async () => {
                if (confirm("Deseja finalizar esta partida e ir para o relatório de estatísticas?")) {
                  await finalizarPartidaAnalise(partida.id);
                }
              }}
            >
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                <Flag className="h-3.5 w-3.5" />
                Finalizar
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Placar ao Vivo e Seletor de Set */}
      <div className="rounded-xl border border-linha bg-quadra-900 p-4 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/15">
          <div className="flex items-center gap-2">
            {partida.status === "ao_vivo" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                Ao Vivo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold uppercase">
                Finalizada
              </span>
            )}
            <span className="text-xs text-white/75">
              {partida.competicao ? `${partida.competicao} · ` : ""}
              {partida.fase ?? ""}
            </span>
          </div>

          <div className="inline-flex rounded-lg bg-white/10 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSetAtual(1)}
              className={`rounded-md px-3 py-1 transition ${
                setAtual === 1 ? "bg-bola-500 text-white shadow" : "text-white/75 hover:text-white"
              }`}
            >
              1º Tempo
            </button>
            <button
              type="button"
              onClick={() => setSetAtual(2)}
              className={`rounded-md px-3 py-1 transition ${
                setAtual === 2 ? "bg-bola-500 text-white shadow" : "text-white/75 hover:text-white"
              }`}
            >
              2º Tempo
            </button>
            <button
              type="button"
              onClick={() => setSetAtual(3)}
              className={`rounded-md px-3 py-1 transition ${
                setAtual === 3 ? "bg-bola-500 text-white shadow" : "text-white/75 hover:text-white"
              }`}
            >
              Shoot-out
            </button>
          </div>
        </div>

        {/* Placar Central */}
        <div className="grid grid-cols-3 items-center gap-2 pt-4 text-center">
          <div>
            <p className="font-titulo text-lg sm:text-xl font-bold truncate">{nomeNos}</p>
            <p className="text-xs text-white/60">Sets: {setsVencidos.nos}</p>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[11px] uppercase tracking-wider text-bola-300 font-semibold">
              {setAtual === 3 ? "Shoot-out" : `${setAtual}º Set`}
            </span>
            <div className="font-titulo text-4xl sm:text-5xl font-extrabold tracking-tight my-1">
              {placarAtualNos} <span className="text-white/40 text-2xl">×</span> {placarAtualAdv}
            </div>
            <div className="flex gap-3 text-[11px] text-white/70">
              <span>1º Set: {partida.set1_nos}×{partida.set1_adv}</span>
              <span>2º Set: {partida.set2_nos}×{partida.set2_adv}</span>
              {(partida.shootout_nos > 0 || partida.shootout_adv > 0) && (
                <span>SO: {partida.shootout_nos}×{partida.shootout_adv}</span>
              )}
            </div>
          </div>

          <div>
            <p className="font-titulo text-lg sm:text-xl font-bold truncate">{nomeAdv}</p>
            <p className="text-xs text-white/60">Sets: {setsVencidos.adv}</p>
          </div>
        </div>
      </div>

      {/* Feedback de Ação Registrada / Desfazer */}
      {(feedback || ultimaAcao) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-linha bg-white px-4 py-2.5 text-xs shadow-sm">
          <div className="flex items-center gap-2">
            {feedback ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {feedback}
              </span>
            ) : ultimaAcao ? (
              <span className="text-suave">
                Último lance:{" "}
                <strong className="text-tinta">
                  {ultimaAcao.lado === "nos" ? nomeNos : nomeAdv}
                </strong>{" "}
                · {ultimaAcao.atleta_nome} ·{" "}
                <strong className="text-tinta">{ROTULO_RESULTADO[ultimaAcao.resultado]}</strong> (
                {ROTULO_TIPO[ultimaAcao.tipo] ?? ultimaAcao.tipo}) · {ultimaAcao.faixa_tempo}
              </span>
            ) : null}
          </div>

          {ultimaAcao && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleExcluirAcao(ultimaAcao.id)}
              className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Desfazer último
            </button>
          )}
        </div>
      )}

      {/* Painel Expansível: Ações Registradas */}
      {verAcoes && (
        <div className="rounded-xl border border-linha bg-white p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-md border border-linha bg-fundo p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setAbaAcoes("todas")}
                className={`rounded px-2.5 py-1 font-semibold ${
                  abaAcoes === "todas" ? "bg-white text-tinta shadow-sm" : "text-suave"
                }`}
              >
                Todas ({acoes.length})
              </button>
              <button
                type="button"
                onClick={() => setAbaAcoes("nos")}
                className={`rounded px-2.5 py-1 font-semibold ${
                  abaAcoes === "nos" ? "bg-white text-tinta shadow-sm" : "text-suave"
                }`}
              >
                {nomeNos}
              </button>
              <button
                type="button"
                onClick={() => setAbaAcoes("adversario")}
                className={`rounded px-2.5 py-1 font-semibold ${
                  abaAcoes === "adversario" ? "bg-white text-tinta shadow-sm" : "text-suave"
                }`}
              >
                {nomeAdv}
              </button>
            </div>

            <button
              type="button"
              onClick={exportarCsv}
              className="inline-flex items-center gap-1.5 rounded-md border border-linha bg-white px-3 py-1.5 text-xs font-semibold text-tinta hover:bg-fundo"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar Excel (CSV)
            </button>
          </div>

          <div className="max-h-72 overflow-auto rounded-lg border border-linha">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 border-b border-linha bg-fundo text-suave uppercase">
                <tr>
                  <th className="px-2.5 py-2">Nº</th>
                  <th className="px-2.5 py-2">Set</th>
                  <th className="px-2.5 py-2">Equipe</th>
                  <th className="px-2.5 py-2">Atleta</th>
                  <th className="px-2.5 py-2">Resultado</th>
                  <th className="px-2.5 py-2">Tipo</th>
                  <th className="px-2.5 py-2">Zona</th>
                  <th className="px-2.5 py-2">Tempo</th>
                  <th className="px-2.5 py-2">Placar</th>
                  <th className="px-2.5 py-2 text-right">Apagar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linha">
                {acoesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-suave">
                      Nenhuma ação registrada ainda.
                    </td>
                  </tr>
                ) : (
                  [...acoesFiltradas].reverse().map((a, idx) => (
                    <tr key={a.id} className="hover:bg-fundo/70">
                      <td className="px-2.5 py-2 text-suave">{acoesFiltradas.length - idx}</td>
                      <td className="px-2.5 py-2">{a.set_numero === 3 ? "SO" : `${a.set_numero}º`}</td>
                      <td className="px-2.5 py-2 font-medium">
                        {a.lado === "nos" ? nomeNos : nomeAdv}
                        {a.resultado === "acao_defensiva" && (
                          <span className="block text-[10px] text-quadra-700">
                            Def: {a.lado === "nos" ? nomeAdv : nomeNos}
                          </span>
                        )}
                      </td>
                      <td className="px-2.5 py-2">
                        {a.atleta_nome}
                        {a.atleta_alvo_nome && (
                          <span className="block text-[10px] text-suave">vs {a.atleta_alvo_nome}</span>
                        )}
                      </td>
                      <td className="px-2.5 py-2 font-semibold">{ROTULO_RESULTADO[a.resultado]}</td>
                      <td className="px-2.5 py-2">{ROTULO_TIPO[a.tipo] ?? a.tipo}</td>
                      <td className="px-2.5 py-2">
                        {a.zona ? ROTULO_ZONA[a.zona] ?? a.zona : "—"}
                        {a.quadrante_baliza && (
                          <span className="block text-[10px] text-bola-600 font-semibold">
                            Gol: {ROTULO_QUADRANTE[a.quadrante_baliza as QuadranteBaliza] ?? a.quadrante_baliza}
                          </span>
                        )}
                      </td>
                      <td className="px-2.5 py-2">{a.faixa_tempo}</td>
                      <td className="px-2.5 py-2 font-mono font-bold">
                        {a.placar_nos_momento}×{a.placar_adv_momento}
                      </td>
                      <td className="px-2.5 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleExcluirAcao(a.id)}
                          className="rounded p-1 text-suave hover:bg-rose-50 hover:text-rose-600"
                          title="Excluir ação"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Wizard de Registro de Ações (9 Passos) */}
      <div className="rounded-xl border border-linha bg-white p-5 shadow-sm space-y-5">
        {/* Indicador de Passos + Chips + Controles */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-linha pb-3">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <span
                key={n}
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition ${
                  passo === n
                    ? "bg-bola-500 text-white ring-2 ring-bola-200"
                    : passo > n
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-cinza-100 text-suave"
                }`}
              >
                {n}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {passo > 1 && (
              <button
                type="button"
                onClick={voltarPasso}
                className="inline-flex items-center gap-1 rounded-md border border-linha bg-white px-2.5 py-1 text-xs font-semibold text-tinta hover:bg-fundo"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Voltar
              </button>
            )}
            {passo > 1 && (
              <button
                type="button"
                onClick={recomecar}
                className="inline-flex items-center gap-1 rounded-md border border-linha bg-white px-2.5 py-1 text-xs font-semibold text-suave hover:text-tinta hover:bg-fundo"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Recomeçar
              </button>
            )}
          </div>
        </div>

        {/* Chips de Resumo das Escolhas Atuais */}
        {lado && (
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-quadra-100 px-3 py-1 text-xs font-bold text-quadra-800">
              {lado === "nos" ? nomeNos : nomeAdv}
            </span>
            {resultado && (
              <span className="rounded-full bg-bola-100 px-3 py-1 text-xs font-bold text-bola-800">
                {ROTULO_RESULTADO[resultado]}
              </span>
            )}
            {atletaSelecionado && (
              <span className="rounded-full bg-cinza-100 px-3 py-1 text-xs font-bold text-tinta">
                {atletaSelecionado.numero ? `#${atletaSelecionado.numero} ` : ""}
                {atletaSelecionado.nome}
              </span>
            )}
            {tipo && (
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800">
                {ROTULO_TIPO[tipo] ?? tipo}
              </span>
            )}
            {atletaAlvo && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                Alvo: {atletaAlvo.numero ? `#${atletaAlvo.numero} ` : ""}
                {atletaAlvo.nome}
              </span>
            )}
            {zona && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                {ROTULO_ZONA[zona] ?? zona}
              </span>
            )}
            {quadranteBaliza && (
              <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                Gol: {ROTULO_QUADRANTE[quadranteBaliza]}
              </span>
            )}
          </div>
        )}

        {/* PASSO 1: Selecione a Equipe (Posse de Bola) */}
        {passo === 1 && (
          <div className="space-y-3">
            <h3 className="font-titulo text-lg font-bold text-tinta">
              1. Selecione a Equipe (Posse de Bola)
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => escolherLado("nos")}
                className="flex items-center justify-center rounded-xl border-2 border-quadra-700 bg-quadra-900 px-6 py-8 font-titulo text-2xl font-bold text-white shadow-sm transition hover:opacity-95 active:scale-[0.99]"
              >
                {nomeNos}
              </button>
              <button
                type="button"
                onClick={() => escolherLado("adversario")}
                className="flex items-center justify-center rounded-xl border-2 border-linha bg-fundo px-6 py-8 font-titulo text-2xl font-bold text-tinta shadow-sm transition hover:border-bola-500 hover:bg-white active:scale-[0.99]"
              >
                🏳️ {nomeAdv}
              </button>
            </div>
          </div>
        )}

        {/* PASSO 2: Selecione o Resultado */}
        {passo === 2 && (
          <div className="space-y-3">
            <h3 className="font-titulo text-lg font-bold text-tinta">2. Selecione o Resultado</h3>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {RESULTADOS_ACAO.map((r) => (
                <button
                  key={r.chave}
                  type="button"
                  onClick={() => escolherResultado(r.chave)}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl px-4 py-6 font-titulo text-base font-bold shadow-sm transition active:scale-[0.98] ${r.cor}`}
                >
                  <span className="text-2xl">{r.icone}</span>
                  <span>{r.rotulo}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASSO 3: Selecione o Atleta / Defensor */}
        {passo === 3 && (
          <div className="space-y-3">
            <h3 className="font-titulo text-lg font-bold text-tinta">
              {resultado === "acao_defensiva"
                ? `3. Selecione o Defensor (${lado === "nos" ? nomeAdv : nomeNos})`
                : `3. Selecione o Atleta (${lado === "nos" ? nomeNos : nomeAdv})`}
            </h3>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {(resultado === "acao_defensiva" ? listaAtletasOposto : listaAtletasAtual).map((a, i) => (
                <button
                  key={a.id ?? `base-${i}`}
                  type="button"
                  onClick={() => escolherAtleta(a)}
                  className="flex items-center gap-2 rounded-lg border border-linha bg-fundo px-3 py-3 text-left text-sm font-semibold text-tinta transition hover:border-bola-500 hover:bg-bola-50 active:scale-[0.98]"
                >
                  {a.numero !== null && a.numero !== undefined && (
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-quadra-900 text-xs font-bold text-white">
                      {a.numero}
                    </span>
                  )}
                  <span className="truncate">{a.nome}</span>
                </button>
              ))}
            </div>

            {/* Opção rápida para digitar número/nome na hora (útil para adversários sem elenco cadastrado) */}
            <div className="flex flex-wrap items-center gap-2 border-t border-linha pt-3">
              <input
                type="text"
                placeholder="Outro atleta (ex: #15 João)..."
                value={atletaCustomNome}
                onChange={(e) => setAtletaCustomNome(e.target.value)}
                className="flex-1 min-w-[180px] max-w-xs rounded-md border border-linha bg-white px-3 py-2 text-xs"
              />
              <button
                type="button"
                disabled={!atletaCustomNome.trim()}
                onClick={() => {
                  escolherAtleta({ id: null, nome: atletaCustomNome.trim() });
                  setAtletaCustomNome("");
                }}
                className="rounded-md bg-quadra-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
              >
                Usar este
              </button>
            </div>
          </div>
        )}

        {/* PASSO 4: Selecione o Tipo */}
        {passo === 4 && (
          <div className="space-y-3">
            <h3 className="font-titulo text-lg font-bold text-tinta">4. Selecione o Tipo</h3>

            {(resultado === "gol" || resultado === "fora" || resultado === "defendido") && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {TIPOS_ARREMESSO_ANALISE.map((t) => (
                  <button
                    key={t.chave}
                    type="button"
                    onClick={() => escolherTipo(t.chave)}
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-linha bg-fundo px-4 py-5 font-titulo text-lg font-bold text-tinta transition hover:border-bola-500 hover:bg-bola-50"
                  >
                    <span>{t.rotulo}</span>
                    <span className="text-[11px] font-normal text-suave">{t.pontos} pt{t.pontos > 1 ? "s" : ""}</span>
                  </button>
                ))}
              </div>
            )}

            {resultado === "turnover" && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {TIPOS_TURNOVER.map((t) => (
                  <button
                    key={t.chave}
                    type="button"
                    onClick={() => escolherTipo(t.chave)}
                    className="rounded-xl border-2 border-linha bg-fundo px-4 py-5 font-titulo text-base font-bold text-tinta transition hover:border-purple-500 hover:bg-purple-50"
                  >
                    {t.rotulo}
                  </button>
                ))}
              </div>
            )}

            {resultado === "acao_defensiva" && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {TIPOS_ACAO_DEFENSIVA.map((t) => (
                  <button
                    key={t.chave}
                    type="button"
                    onClick={() => escolherTipo(t.chave)}
                    className="rounded-xl border-2 border-linha bg-fundo px-4 py-5 font-titulo text-base font-bold text-tinta transition hover:border-quadra-600 hover:bg-quadra-50"
                  >
                    {t.rotulo}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PASSO 5: Condicional BLOCK -> Qual atacante foi bloqueado? */}
        {passo === 5 && (
          <div className="space-y-3">
            <h3 className="font-titulo text-lg font-bold text-tinta">
              5. Qual atacante foi bloqueado? ({lado === "nos" ? nomeNos : nomeAdv})
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {listaAtletasAtual.map((a, i) => (
                <button
                  key={a.id ?? `alvo-${i}`}
                  type="button"
                  onClick={() => escolherAlvoBlock(a)}
                  className="flex items-center gap-2 rounded-lg border border-linha bg-fundo px-3 py-3 text-left text-sm font-semibold text-tinta hover:border-bola-500 hover:bg-bola-50"
                >
                  {a.numero !== null && a.numero !== undefined && (
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-quadra-900 text-xs font-bold text-white">
                      {a.numero}
                    </span>
                  )}
                  <span className="truncate">{a.nome}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => escolherAlvoBlock(null)}
                className="rounded-lg border border-dashed border-linha bg-white px-3 py-3 text-sm font-medium text-suave hover:bg-fundo"
              >
                Não identificado / Pular
              </button>
            </div>
          </div>
        )}

        {/* PASSO 6: Condicional ROUBO -> Qual atleta perdeu a bola? */}
        {passo === 6 && (
          <div className="space-y-3">
            <h3 className="font-titulo text-lg font-bold text-tinta">
              6. Qual atleta perdeu a bola? ({lado === "nos" ? nomeNos : nomeAdv})
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {listaAtletasAtual.map((a, i) => (
                <button
                  key={a.id ?? `roubo-${i}`}
                  type="button"
                  onClick={() => escolherAlvoRoubo(a)}
                  className="flex items-center gap-2 rounded-lg border border-linha bg-fundo px-3 py-3 text-left text-sm font-semibold text-tinta hover:border-bola-500 hover:bg-bola-50"
                >
                  {a.numero !== null && a.numero !== undefined && (
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-quadra-900 text-xs font-bold text-white">
                      {a.numero}
                    </span>
                  )}
                  <span className="truncate">{a.nome}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => escolherAlvoRoubo(null)}
                className="rounded-lg border border-dashed border-linha bg-white px-3 py-3 text-sm font-medium text-suave hover:bg-fundo"
              >
                Não identificado / Pular
              </button>
            </div>
          </div>
        )}

        {/* PASSO 7: Selecione a Zona */}
        {passo === 7 && (
          <div className="space-y-3">
            <h3 className="font-titulo text-lg font-bold text-tinta">7. Selecione a Zona</h3>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {ZONAS_ATAQUE.map((z) => (
                <button
                  key={z.chave}
                  type="button"
                  onClick={() => escolherZona(z.chave)}
                  className={`rounded-xl border-2 px-3 py-4 font-titulo text-sm font-bold transition ${
                    z.chave === "contra_ataque"
                      ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                      : "border-linha bg-fundo text-tinta hover:border-bola-500 hover:bg-bola-50"
                  }`}
                >
                  {z.curto}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASSO 8: Região do Gol (Baliza) */}
        {passo === 8 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-titulo text-lg font-bold text-tinta">
                8. Selecione a Região do Gol (Arremesso)
              </h3>
              <button
                type="button"
                onClick={() => escolherQuadrante(null)}
                className="rounded-md border border-dashed border-linha bg-fundo px-3 py-1.5 text-xs font-semibold text-suave hover:text-tinta"
              >
                Pular / Não informada →
              </button>
            </div>
            <BalizaInterativa
              modo="selecao"
              selecionado={quadranteBaliza}
              aoSelecionar={(q) => escolherQuadrante(q)}
            />
          </div>
        )}

        {/* PASSO 9: Selecione o Tempo */}
        {passo === 9 && (
          <div className="space-y-3">
            <h3 className="font-titulo text-lg font-bold text-tinta">
              9. Selecione o Tempo (min) — Salvar Lance
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {FAIXAS_TEMPO.map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={isPending}
                  onClick={() => finalizarLance(t)}
                  className="rounded-xl border-2 border-emerald-600 bg-emerald-600 px-4 py-6 font-titulo text-xl font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
                >
                  {t} min
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
