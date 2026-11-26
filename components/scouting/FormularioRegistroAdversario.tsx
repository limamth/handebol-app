"use client";

import { useState } from "react";
import { BalizaInterativa } from "./BalizaInterativa";
import { SeletorTecnicaSaida } from "./SeletorTecnicaSaida";
import { VisualizacaoSetoresQuadra } from "./VisualizacaoSetoresQuadra";
import {
  type EstiloGoleiro,
  type QuadranteBaliza,
  type TecnicaSaida,
  type EquipeAdversaria,
  type AtletaAdversario,
  type TipoArremessoJogo,
  type SetorOrigemJogo,
  TIPOS_ARREMESSO_JOGO,
  ROTULO_TIPO_JOGO,
} from "@/lib/scouting";
import { registrarScoutBatida } from "@/app/(app)/shootout/adversarios/actions";
import { CheckCircle2, AlertCircle, PlusCircle } from "lucide-react";

interface Props {
  equipes: EquipeAdversaria[];
  atletas: AtletaAdversario[];
  nossosGoleiros: { id: string; nome: string }[];
  equipeInicial?: string;
  atletaInicial?: string;
  origemInicial?: "shootout" | "jogo";
}

export function FormularioRegistroAdversario({
  equipes,
  atletas,
  nossosGoleiros,
  equipeInicial = "",
  atletaInicial = "",
  origemInicial = "shootout",
}: Props) {
  const [origem, setOrigem] = useState<"shootout" | "jogo">(origemInicial);
  const [equipeId, setEquipeId] = useState<string>(equipeInicial || (equipes[0]?.id ?? ""));
  const [atletaId, setAtletaId] = useState<string>(atletaInicial);

  // Estados de Shoot-out
  const [estiloGoleiro, setEstiloGoleiro] = useState<EstiloGoleiro>("baliza");
  const [tecnica, setTecnica] = useState<TecnicaSaida | null>(null);

  // Estados de Jogo Regulamentar
  const [tipoFinalizacao, setTipoFinalizacao] = useState<TipoArremessoJogo>("giro");
  const [zonaCampo, setZonaCampo] = useState<SetorOrigemJogo | null>(null);

  // Estados compartilhados
  const [quadrante, setQuadrante] = useState<QuadranteBaliza | null>(null);
  const [resultado, setResultado] = useState<"convertido" | "perdido">("convertido");
  const [nossoGoleiroId, setNossoGoleiroId] = useState<string>("");
  const [observacao, setObservacao] = useState<string>("");
  const [salvando, setSalvando] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "erro"; msg: string } | null>(null);

  // Modal/Toggle rápido de cadastro
  const [criandoEquipe, setCriandoEquipe] = useState(false);
  const [criandoAtleta, setCriandoAtleta] = useState(false);

  const atletasDaEquipe = atletas.filter((a) => a.equipeAdversariaId === equipeId);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (!equipeId) {
      setFeedback({ tipo: "erro", msg: "Selecione a equipe adversária." });
      return;
    }

    if (origem === "shootout") {
      if (estiloGoleiro === "baliza" && !quadrante) {
        setFeedback({ tipo: "erro", msg: "Para goleiro de baliza, selecione a região/quadrante no gol." });
        return;
      }
      if (estiloGoleiro === "saida" && !tecnica) {
        setFeedback({ tipo: "erro", msg: "Para goleiro de saída, selecione a forma/técnica da batida do atacante." });
        return;
      }
    } else {
      // Jogo Regulamentar
      if (!tipoFinalizacao) {
        setFeedback({ tipo: "erro", msg: "Selecione o tipo de arremesso de jogo." });
        return;
      }
      if (tipoFinalizacao !== "6m" && !zonaCampo) {
        setFeedback({ tipo: "erro", msg: "Selecione o setor de origem do arremesso na quadra." });
        return;
      }
    }

    setSalvando(true);
    try {
      await registrarScoutBatida({
        equipeId,
        atletaId: atletaId || null,
        origem,
        estiloGoleiro: origem === "shootout" ? estiloGoleiro : null,
        quadranteBaliza: quadrante,
        tecnicaSaida: origem === "shootout" && estiloGoleiro === "saida" ? tecnica : null,
        tipoFinalizacao: origem === "jogo" ? tipoFinalizacao : null,
        zonaCampo: origem === "jogo" && tipoFinalizacao !== "6m" ? zonaCampo : null,
        resultado,
        nossoGoleiroId: nossoGoleiroId || null,
        observacao: observacao || null,
      });

      const rotuloOrigem = origem === "jogo" ? "Finalização de jogo" : "Batida de shoot-out";
      setFeedback({
        tipo: "ok",
        msg: `${rotuloOrigem} registrada com sucesso! (${resultado === "convertido" ? "Gol" : "Perdido"})`,
      });

      // Limpa os seletores específicos para o próximo registro
      setQuadrante(null);
      setTecnica(null);
      setZonaCampo(null);
      setObservacao("");
    } catch (err: any) {
      setFeedback({ tipo: "erro", msg: err.message || "Erro ao registrar lance de scout." });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSalvar} className="space-y-6 rounded-xl border border-linha bg-white p-5 md:p-6 shadow-sm">
      {feedback && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-lg p-3 text-sm font-medium ${
            feedback.tipo === "ok" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {feedback.tipo === "ok" ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* 0. Seletor de Modo: Shoot-out vs Jogo Regulamentar */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-suave">
          Contexto do Lance
        </label>
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-fundo p-1 border border-linha">
          <button
            type="button"
            onClick={() => setOrigem("shootout")}
            className={`rounded-md py-2.5 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
              origem === "shootout"
                ? "bg-quadra-900 text-white shadow-sm"
                : "text-suave hover:text-tinta"
            }`}
          >
            <span>🎯</span> Shoot-out
          </button>
          <button
            type="button"
            onClick={() => setOrigem("jogo")}
            className={`rounded-md py-2.5 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
              origem === "jogo"
                ? "bg-quadra-900 text-white shadow-sm"
                : "text-suave hover:text-tinta"
            }`}
          >
            <span>🤾</span> Finalização de Jogo
          </button>
        </div>
      </div>

      {/* 1. Seleção da Equipe e Atleta Adversário */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-semibold text-tinta">Equipe Adversária</label>
            <button
              type="button"
              onClick={() => setCriandoEquipe(!criandoEquipe)}
              className="text-xs text-quadra-600 font-medium hover:underline flex items-center gap-1"
            >
              <PlusCircle className="h-3 w-3" /> {criandoEquipe ? "Cancelar" : "Nova equipe"}
            </button>
          </div>
          {criandoEquipe ? (
            <div className="flex gap-2">
              <input
                id="novo_nome_equipe"
                placeholder="Nome da equipe rival"
                className="w-full rounded-md border border-linha px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={async () => {
                  const input = document.getElementById("novo_nome_equipe") as HTMLInputElement;
                  if (!input?.value) return;
                  window.location.href = `/scout/registro?novaEquipe=${encodeURIComponent(input.value)}&modo=${origem}`;
                }}
                className="rounded bg-quadra-900 px-3 py-2 text-xs font-semibold text-white"
              >
                Adicionar
              </button>
            </div>
          ) : (
            <select
              value={equipeId}
              onChange={(e) => {
                setEquipeId(e.target.value);
                setAtletaId("");
              }}
              required
              className="w-full rounded-md border border-linha bg-white px-3 py-2.5 text-sm"
            >
              <option value="" disabled>Selecione a equipe rival</option>
              {equipes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome} {e.categoria ? `(${e.categoria})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-semibold text-tinta">Atleta / Cobrador</label>
            {equipeId && (
              <button
                type="button"
                onClick={() => setCriandoAtleta(!criandoAtleta)}
                className="text-xs text-quadra-600 font-medium hover:underline flex items-center gap-1"
              >
                <PlusCircle className="h-3 w-3" /> {criandoAtleta ? "Cancelar" : "Novo atleta"}
              </button>
            )}
          </div>
          <select
            value={atletaId}
            onChange={(e) => setAtletaId(e.target.value)}
            disabled={!equipeId}
            className="w-full rounded-md border border-linha bg-white px-3 py-2.5 text-sm disabled:bg-fundo"
          >
            <option value="">Atleta não especificado / Equipe</option>
            {atletasDaEquipe.map((a) => (
              <option key={a.id} value={a.id}>
                {a.numero ? `#${a.numero} ` : ""}{a.nome} {a.posicao ? `· ${a.posicao}` : ""} {a.mao ? `(${a.mao})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. CAMPOS CONDICIONAIS POR CONTEXTO */}
      {origem === "shootout" ? (
        <>
          {/* Seleção do Estilo do Goleiro (BALIZA vs SAÍDA) */}
          <div className="space-y-2 border-t border-linha pt-4">
            <label className="text-sm font-semibold text-tinta">
              Como o goleiro atuou nesta batida?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setEstiloGoleiro("baliza");
                  setTecnica(null);
                }}
                className={`flex flex-col items-center justify-center rounded-lg border p-3.5 transition ${
                  estiloGoleiro === "baliza"
                    ? "border-quadra-900 bg-quadra-900 text-white shadow"
                    : "border-linha bg-white text-tinta hover:bg-fundo"
                }`}
              >
                <span className="font-bold text-base">🥅 Goleiro de Baliza</span>
                <span className="text-xs opacity-80 mt-0.5">Goleiro fica na baliza (registrar região no gol)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEstiloGoleiro("saida");
                  setQuadrante(null);
                }}
                className={`flex flex-col items-center justify-center rounded-lg border p-3.5 transition ${
                  estiloGoleiro === "saida"
                    ? "border-quadra-900 bg-quadra-900 text-white shadow"
                    : "border-linha bg-white text-tinta hover:bg-fundo"
                }`}
              >
                <span className="font-bold text-base">⚡ Goleiro de Saída</span>
                <span className="text-xs opacity-80 mt-0.5">Goleiro sai no atacante (registrar forma da batida)</span>
              </button>
            </div>
          </div>

          {/* Área Condicional do Shoot-out: Baliza OU Técnicas de Saída */}
          <div className="rounded-xl border border-linha bg-fundo/40 p-4">
            {estiloGoleiro === "baliza" ? (
              <BalizaInterativa
                modo="selecao"
                selecionado={quadrante}
                aoSelecionar={(q) => setQuadrante(q)}
                disabled={salvando}
              />
            ) : (
              <SeletorTecnicaSaida
                modo="selecao"
                selecionada={tecnica}
                aoSelecionar={(t) => setTecnica(t)}
                disabled={salvando}
              />
            )}
          </div>
        </>
      ) : (
        /* MODO JOGO REGULAMENTAR */
        <>
          {/* Seleção do Tipo de Arremesso */}
          <div className="space-y-2 border-t border-linha pt-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-tinta">
                Tipo de Arremesso <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs text-suave">Regra oficial do Handebol de Praia</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {TIPOS_ARREMESSO_JOGO.map((tipo) => {
                const ativo = tipoFinalizacao === tipo;
                const info = ROTULO_TIPO_JOGO[tipo];
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => {
                      setTipoFinalizacao(tipo);
                      if (tipo === "6m") setZonaCampo(null);
                    }}
                    className={`flex flex-col items-center justify-center rounded-lg border p-3 transition ${
                      ativo
                        ? "border-quadra-900 bg-quadra-900 text-white shadow"
                        : "border-linha bg-white text-tinta hover:bg-fundo"
                    }`}
                  >
                    <span className="font-bold text-sm">{info.rotulo}</span>
                    <span className={`text-[10px] mt-0.5 font-semibold ${ativo ? "text-amber-200" : "text-bola-500"}`}>
                      {info.pontos === 2 ? "2 pontos" : "1 ponto"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Setor de Origem na Quadra (desabilitado/informado para 6m) */}
          <div className="border-t border-linha pt-4">
            <VisualizacaoSetoresQuadra
              modo="selecao"
              selecionado={zonaCampo}
              aoSelecionar={(s) => setZonaCampo(s)}
              ehTiro6m={tipoFinalizacao === "6m"}
              desabilitado={salvando}
            />
          </div>

          {/* Região na Baliza (onde o arremesso de jogo foi) */}
          <div className="space-y-2 border-t border-linha pt-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-tinta">
                Região na Baliza (Onde foi a bola?)
              </label>
              <span className="text-xs text-suave">Quadrante no gol, trave ou fora</span>
            </div>
            <div className="rounded-xl border border-linha bg-fundo/40 p-4">
              <BalizaInterativa
                modo="selecao"
                selecionado={quadrante}
                aoSelecionar={(q) => setQuadrante(q)}
                disabled={salvando}
              />
            </div>
          </div>
        </>
      )}

      {/* 3. Desfecho do Lance */}
      <div className="space-y-2 border-t border-linha pt-4">
        <label className="text-sm font-semibold text-tinta">Resultado da Finalização</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setResultado("convertido")}
            className={`rounded-lg border py-3 text-center font-bold text-sm transition ${
              resultado === "convertido"
                ? "border-emerald-600 bg-emerald-600 text-white shadow"
                : "border-linha bg-white text-tinta hover:bg-fundo"
            }`}
          >
            ⚽ Gol Convertido
          </button>

          <button
            type="button"
            onClick={() => setResultado("perdido")}
            className={`rounded-lg border py-3 text-center font-bold text-sm transition ${
              resultado === "perdido"
                ? "border-rose-600 bg-rose-600 text-white shadow"
                : "border-linha bg-white text-tinta hover:bg-fundo"
            }`}
          >
            🧤 Perdido / Defesa
          </button>
        </div>
      </div>

      {/* 4. Informações Complementares Opcionais */}
      <div className="grid gap-3 sm:grid-cols-2 border-t border-linha pt-4 text-xs">
        <div>
          <label className="font-medium text-suave">Nosso Goleiro na baliza (opcional)</label>
          <select
            value={nossoGoleiroId}
            onChange={(e) => setNossoGoleiroId(e.target.value)}
            className="mt-1 w-full rounded-md border border-linha bg-white px-2.5 py-2"
          >
            <option value="">Não informado</option>
            {nossosGoleiros.map((g) => (
              <option key={g.id} value={g.id}>{g.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="font-medium text-suave">Observação técnica (opcional)</label>
          <input
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            maxLength={200}
            placeholder={
              origem === "jogo"
                ? "Ex.: Finta de braço, arremessou na passada, tiro rápido"
                : "Ex.: Fingiu passe antes de girar, arremessou caindo"
            }
            className="mt-1 w-full rounded-md border border-linha bg-white px-2.5 py-2"
          />
        </div>
      </div>

      {/* Botão de Envio */}
      <button
        type="submit"
        disabled={salvando}
        className="w-full rounded-lg bg-bola-500 py-3.5 font-bold text-white shadow transition hover:opacity-90 disabled:opacity-50"
      >
        {salvando
          ? "Registrando no Scout..."
          : origem === "jogo"
          ? "Salvar Finalização de Jogo"
          : "Salvar Batida de Shoot-out"}
      </button>
    </form>
  );
}
