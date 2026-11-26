"use client";

import Link from "next/link";
import {
  type SetorOrigemJogo,
  SETORES_ORIGEM_JOGO,
  ROTULO_SETOR_JOGO,
  type EstatisticasJogo,
} from "@/lib/scouting";

interface PropsSelecao {
  modo: "selecao";
  selecionado: SetorOrigemJogo | null;
  aoSelecionar: (setor: SetorOrigemJogo | null) => void;
  desabilitado?: boolean;
  ehTiro6m?: boolean;
}

interface PropsVisualizacao {
  modo: "visualizacao";
  estatisticas: EstatisticasJogo;
  setorSelecionado?: SetorOrigemJogo | "6m" | null;
  hrefsSetor?: Partial<Record<SetorOrigemJogo | "6m", string>>;
}

type Props = PropsSelecao | PropsVisualizacao;

export function VisualizacaoSetoresQuadra(props: Props) {
  if (props.modo === "selecao") {
    const { selecionado, aoSelecionar, desabilitado, ehTiro6m } = props;

    if (ehTiro6m) {
      return (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-4 text-center">
          <div className="inline-flex items-center justify-center rounded-full bg-amber-100 p-2 text-amber-800 mb-1">
            <span className="text-xl">🎯</span>
          </div>
          <p className="font-semibold text-sm text-amber-900">Tiro de 6 Metros (Pênalti)</p>
          <p className="text-xs text-amber-700 mt-0.5">
            O arremesso de 6m é cobrado no centro da linha da área e não possui setor de origem em quadra aberta.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-tinta">
            Setor de Origem do Arremesso <span className="text-rose-500">*</span>
          </label>
          <span className="text-xs text-suave">Perspectiva do ataque</span>
        </div>

        {/* Quadra de Areia com 4 Setores de Ataque */}
        <div className="relative rounded-xl border border-amber-200 bg-gradient-to-b from-amber-100/60 to-amber-200/50 p-3 shadow-inner">
          {/* Indicador da Baliza / Linha de 6m */}
          <div className="mb-2 flex flex-col items-center">
            <div className="h-2 w-28 rounded-t bg-slate-800" title="Baliza" />
            <div className="h-6 w-44 rounded-b-full border-b-2 border-dashed border-amber-600/70 bg-amber-200/60 flex items-center justify-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900/70">Área de 6m</span>
            </div>
          </div>

          {/* Os 4 Setores */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SETORES_ORIGEM_JOGO.map((setor) => {
              const ativo = selecionado === setor;
              return (
                <button
                  key={setor}
                  type="button"
                  disabled={desabilitado}
                  onClick={() => aoSelecionar(ativo ? null : setor)}
                  className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition ${
                    ativo
                      ? "border-quadra-900 bg-quadra-900 text-white shadow-md scale-[1.02]"
                      : "border-amber-300 bg-white/90 text-tinta hover:bg-white hover:border-amber-400"
                  } disabled:opacity-50`}
                >
                  <span className="text-xs font-bold leading-tight">
                    {ROTULO_SETOR_JOGO[setor]}
                  </span>
                  <span className={`text-[10px] mt-1 ${ativo ? "text-slate-200" : "text-suave"}`}>
                    {ativo ? "Selecionado" : "Clique p/ marcar"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // MODO VISUALIZACAO: Exibe dados objetivos e quantitativos (com filtro clicável opcional)
  const { estatisticas, setorSelecionado, hrefsSetor } = props;
  const { porSetor, tiros6m } = estatisticas;

  // Encontra maior volume para escala de gradiente visual
  const volumes = SETORES_ORIGEM_JOGO.map((s) => porSetor[s].total);
  const maxVolume = Math.max(...volumes, 1);

  return (
    <div className="space-y-4">
      {/* Quadra gráfica de areia */}
      <div className="relative rounded-xl border border-amber-200 bg-gradient-to-b from-amber-50 to-amber-100/70 p-4 shadow-sm">
        {/* Baliza e Área no topo */}
        <div className="mb-3 flex flex-col items-center">
          <div className="h-2 w-32 rounded-t bg-slate-800" title="Baliza" />
          <div className="h-7 w-48 rounded-b-full border-b-2 border-dashed border-amber-600/60 bg-amber-200/50 flex items-center justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900/70">
              Área de Gol (6m)
            </span>
          </div>
        </div>

        {/* 4 Setores da Quadra */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SETORES_ORIGEM_JOGO.map((setor) => {
            const info = porSetor[setor];
            const pct = info.total ? Math.round((info.gols / info.total) * 100) : null;
            const intensidade = info.total / maxVolume;
            const ativo = setorSelecionado === setor;
            const href = hrefsSetor?.[setor] ?? null;

            const cardClass = `flex flex-col justify-between rounded-lg border p-3 text-center transition ${
              ativo
                ? "border-quadra-900 bg-quadra-900 text-white shadow-md ring-2 ring-bola-500"
                : info.total > 0
                ? intensidade > 0.6
                  ? "border-amber-400 bg-white/95 shadow-sm hover:border-quadra-600"
                  : "border-amber-300 bg-white/90 hover:border-quadra-600"
                : "border-amber-200/70 bg-white/60 opacity-80 hover:opacity-100"
            }`;

            const conteudo = (
              <>
                <div>
                  <p className={`text-xs font-bold ${ativo ? "text-white" : "text-tinta"}`}>
                    {ROTULO_SETOR_JOGO[setor]}
                  </p>
                  <p className={`text-[11px] mt-0.5 ${ativo ? "text-white/80" : "text-suave"}`}>
                    {info.total} {info.total === 1 ? "arremesso" : "arremessos"}
                  </p>
                </div>

                <div className={`mt-3 pt-2 border-t ${ativo ? "border-white/20" : "border-linha/60"}`}>
                  <p className={`text-base font-extrabold ${ativo ? "text-white" : "text-tinta"}`}>
                    {info.gols}{" "}
                    <span className={`text-xs font-normal ${ativo ? "text-white/80" : "text-suave"}`}>
                      gol(s)
                    </span>
                  </p>
                  <p className={`text-xs font-semibold ${ativo ? "text-bola-300" : "text-quadra-600"}`}>
                    {pct !== null ? `${pct}% aprov.` : "-"}
                  </p>
                  {href && (
                    <p className={`mt-1 text-[10px] ${ativo ? "text-bola-300 font-semibold" : "text-suave"}`}>
                      {ativo ? "Filtrado (limpar)" : "Clique p/ filtrar"}
                    </p>
                  )}
                </div>
              </>
            );

            return href ? (
              <Link key={setor} href={href} scroll={false} className={cardClass}>
                {conteudo}
              </Link>
            ) : (
              <div key={setor} className={cardClass}>
                {conteudo}
              </div>
            );
          })}
        </div>
      </div>

      {/* Estatística isolada de Tiro de 6 Metros (clicável quando hrefsSetor for passado) */}
      {(() => {
        const ativo6m = setorSelecionado === "6m";
        const href6m = hrefsSetor?.["6m"] ?? null;
        const class6m = `flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-sm transition ${
          ativo6m
            ? "border-quadra-900 bg-quadra-900 text-white ring-2 ring-bola-500"
            : "border-linha bg-white hover:border-quadra-600"
        }`;
        const conteudo6m = (
          <>
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
                  ativo6m ? "bg-bola-500 text-white" : "bg-quadra-100 text-quadra-900"
                }`}
              >
                6m
              </span>
              <div>
                <p className={`text-sm font-bold ${ativo6m ? "text-white" : "text-tinta"}`}>
                  Tiros de 6 Metros (Pênalti)
                </p>
                <p className={`text-xs ${ativo6m ? "text-white/80" : "text-suave"}`}>
                  {href6m
                    ? ativo6m
                      ? "Filtrado · clique para limpar"
                      : "Clique para filtrar apenas tiros de 6m"
                    : "Cobranças diretas sem setor de origem"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <span className={`text-xs block ${ativo6m ? "text-white/75" : "text-suave"}`}>Volume</span>
                <span className={`text-sm font-bold ${ativo6m ? "text-white" : "text-tinta"}`}>
                  {tiros6m.total}
                </span>
              </div>
              <div>
                <span className={`text-xs block ${ativo6m ? "text-white/75" : "text-suave"}`}>Gols</span>
                <span className={`text-sm font-bold ${ativo6m ? "text-emerald-300" : "text-emerald-700"}`}>
                  {tiros6m.gols}
                </span>
              </div>
              <div>
                <span className={`text-xs block ${ativo6m ? "text-white/75" : "text-suave"}`}>
                  Aproveitamento
                </span>
                <span className={`text-sm font-bold ${ativo6m ? "text-bola-300" : "text-quadra-900"}`}>
                  {tiros6m.pctGol !== null ? `${Math.round(tiros6m.pctGol * 100)}%` : "-"}
                </span>
              </div>
            </div>
          </>
        );

        return href6m ? (
          <Link href={href6m} scroll={false} className={class6m}>
            {conteudo6m}
          </Link>
        ) : (
          <div className={class6m}>{conteudo6m}</div>
        );
      })()}
    </div>
  );
}
