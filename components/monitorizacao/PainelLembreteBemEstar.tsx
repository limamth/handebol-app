"use client";

import { useState } from "react";
import { Bell, Clock, Users, Send, CheckCircle2, AlertCircle, Copy, Check, Settings2 } from "lucide-react";
import type { ConfiguracaoLembretes, ResultadoVerificacaoPendencias } from "@/lib/notificacoes";

interface Props {
  configuracao: ConfiguracaoLembretes;
  pendencias: ResultadoVerificacaoPendencias;
  podeEditar: boolean;
  onSalvarHorario: (formData: FormData) => Promise<void>;
  onDispararManual: (formData: FormData) => Promise<void>;
}

export function PainelLembreteBemEstar({
  configuracao,
  pendencias,
  podeEditar,
  onSalvarHorario,
  onDispararManual,
}: Props) {
  const [editandoHorario, setEditandoHorario] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [disparando, setDisparando] = useState(false);

  const { faseAtiva, totalConvocados, totalRespondidos, pendentes } = pendencias;
  const pctAdesao = totalConvocados > 0 ? Math.round((totalRespondidos / totalConvocados) * 100) : 0;

  function copiarParaWhatsApp() {
    if (!faseAtiva || pendentes.length === 0) return;

    const nomes = pendentes.map((p, i) => `${i + 1}. ${p.nome}`).join("\n");
    const texto = `*Lembrete de Bem-Estar - Handebol Hub*\n` +
      `Fase: *${faseAtiva.nome}*\n\n` +
      `Olá atletas convocados, favor responder o questionário de bem-estar de hoje no app:\n\n` +
      `${nomes}\n\n` +
      `👉 Acesse: https://handebolapp.com.br/meu-bem-estar`;

    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    });
  }

  return (
    <div className="rounded-xl border border-linha bg-white p-5 shadow-sm space-y-4">
      {/* 1. Topo do Painel */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linha pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-bola-50 text-bola-500 border border-bola-200">
            <Bell className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-titulo text-lg font-bold text-tinta">Lembrete Diário de Bem-Estar</h2>
            <p className="text-xs text-suave">
              Notifica no horário fixo todos os atletas convocados em fase ativa que ainda não responderam hoje.
            </p>
          </div>
        </div>

        {podeEditar && (
          <button
            type="button"
            onClick={() => setEditandoHorario(!editandoHorario)}
            className="inline-flex items-center gap-1.5 rounded-md border border-linha px-3 py-1.5 text-xs font-semibold text-tinta hover:bg-fundo"
          >
            <Settings2 className="h-3.5 w-3.5" />
            {editandoHorario ? "Fechar configuração" : "Configurar horário"}
          </button>
        )}
      </div>

      {/* 2. Formulário Inline de Configuração de Horário Fixo */}
      {editandoHorario && podeEditar && (
        <form
          action={onSalvarHorario}
          className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-900">Definição do Horário Fixo de Notificação</span>
            <span className="text-amber-800/80">Fuso de Brasília</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 font-medium text-amber-950">
              <Clock className="h-4 w-4 text-amber-600" />
              Horário do disparo:
              <input
                type="time"
                name="horario"
                required
                defaultValue={configuracao.horarioLembrete}
                className="rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-bold text-tinta"
              />
            </label>

            <label className="flex items-center gap-2 font-medium text-amber-950 ml-4">
              <input
                type="checkbox"
                name="ativo"
                value="1"
                defaultChecked={configuracao.ativo}
                className="rounded border-amber-300 text-bola-500"
              />
              Lembretes automáticos ativos
            </label>

            <button
              type="submit"
              className="rounded-md bg-amber-600 px-3 py-1.5 font-bold text-white shadow-sm hover:bg-amber-700 transition ml-auto"
            >
              Salvar horário
            </button>
          </div>
        </form>
      )}

      {/* 3. Indicadores de Status */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Card 1: Horário Fixo */}
        <div className="rounded-lg border border-linha bg-fundo/40 p-3">
          <span className="text-xs text-suave block">Horário Fixo de Notificação</span>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="h-4 w-4 text-bola-500" />
            <span className="text-lg font-bold text-tinta">{configuracao.horarioLembrete}</span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                configuracao.ativo ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
              }`}
            >
              {configuracao.ativo ? "Ativo" : "Pausado"}
            </span>
          </div>
        </div>

        {/* Card 2: Fase Ativa Hoje */}
        <div className="rounded-lg border border-linha bg-fundo/40 p-3">
          <span className="text-xs text-suave block">Fase de Treinamento Ativa</span>
          <div className="mt-1">
            {faseAtiva ? (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-sm text-tinta truncate" title={faseAtiva.nome}>
                  {faseAtiva.nome}
                </span>
              </div>
            ) : (
              <span className="text-xs text-suave font-medium">Nenhuma fase ativa hoje</span>
            )}
          </div>
        </div>

        {/* Card 3: Adesão dos Convocados */}
        <div className="rounded-lg border border-linha bg-fundo/40 p-3">
          <span className="text-xs text-suave block">Adesão dos Convocados</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-lg font-bold text-tinta">
              {totalRespondidos} <span className="text-xs font-normal text-suave">de {totalConvocados}</span>
            </span>
            <span className="text-xs font-bold text-quadra-600">{pctAdesao}%</span>
          </div>
          {/* Barra de progresso */}
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-linha overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${pctAdesao}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. Lista dos Convocados Pendentes e Ações */}
      {!faseAtiva ? (
        <div className="rounded-lg border border-dashed border-linha bg-fundo/20 p-4 text-center text-xs text-suave">
          O questionário de bem-estar só é exigido dos atletas quando há uma <strong>fase de treinamento ativa</strong>. Nenhuma notificação será enviada hoje.
        </div>
      ) : pendentes.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Excelente! Todos os <strong>{totalConvocados} atletas convocados</strong> já responderam o questionário de hoje.</span>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-tinta flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-bola-500" />
              Atletas Convocados com Pendência Hoje ({pendentes.length}):
            </span>

            {podeEditar && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copiarParaWhatsApp}
                  className="inline-flex items-center gap-1 rounded border border-linha bg-white px-2.5 py-1 text-xs font-semibold text-tinta hover:bg-fundo"
                >
                  {copiado ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiado ? "Copiado!" : "Copiar p/ WhatsApp"}
                </button>

                <form
                  action={async (fd) => {
                    setDisparando(true);
                    await onDispararManual(fd);
                    setDisparando(false);
                  }}
                >
                  <button
                    type="submit"
                    disabled={disparando}
                    className="inline-flex items-center gap-1.5 rounded bg-bola-500 px-3 py-1 text-xs font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
                  >
                    <Send className="h-3 w-3" />
                    {disparando ? "Disparando..." : "Disparar Lembrete Agora"}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Chips dos nomes pendentes */}
          <div className="flex flex-wrap gap-1.5">
            {pendentes.map((a) => (
              <span
                key={a.atletaId}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50/70 px-2.5 py-1 text-xs text-amber-950 font-medium"
              >
                <span>{a.nome}</span>
                <span
                  title={a.temInscricaoPush ? "Push ativado no aparelho" : "Aparelho sem notificações ativadas"}
                  className={`h-1.5 w-1.5 rounded-full ${
                    a.temInscricaoPush ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
