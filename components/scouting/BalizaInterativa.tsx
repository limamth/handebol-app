"use client";

import {
  type QuadranteBaliza,
  QUADRANTES_GOL,
  ROTULO_QUADRANTE,
  type EstatisticasBaliza,
} from "@/lib/scouting";

interface PropsSelecao {
  modo: "selecao";
  selecionado: QuadranteBaliza | null;
  aoSelecionar: (quadrante: QuadranteBaliza) => void;
  disabled?: boolean;
}

interface PropsHeatmap {
  modo: "heatmap";
  estatisticas: EstatisticasBaliza;
  destacar?: "todos" | "gols" | "defesas";
}

type Props = PropsSelecao | PropsHeatmap;

export function BalizaInterativa(props: Props) {
  const GRID_3X3: QuadranteBaliza[][] = [
    ["sup_esq", "sup_cen", "sup_dir"],
    ["med_esq", "med_cen", "med_dir"],
    ["inf_esq", "inf_cen", "inf_dir"],
  ];

  if (props.modo === "selecao") {
    const { selecionado, aoSelecionar, disabled } = props;

    return (
      <div className="w-full max-w-md mx-auto space-y-2 select-none">
        <p className="text-xs font-semibold uppercase tracking-wider text-suave text-center">
          Toque no quadrante da baliza onde a bola foi
        </p>

        {/* Estrutura da Baliza */}
        <div className="relative rounded-t-lg border-t-8 border-x-8 border-slate-700 bg-slate-900/90 p-1.5 shadow-inner">
          {/* Rede de fundo */}
          <div
            className="grid grid-cols-3 gap-1.5 rounded bg-slate-800/80 p-1"
            style={{
              backgroundImage: "radial-gradient(#475569 1px, transparent 1px)",
              backgroundSize: "12px 12px",
            }}
          >
            {GRID_3X3.flat().map((quad) => {
              const ativo = selecionado === quad;
              return (
                <button
                  type="button"
                  key={quad}
                  disabled={disabled}
                  onClick={() => aoSelecionar(quad)}
                  className={`flex h-20 sm:h-24 flex-col items-center justify-center rounded border text-xs font-bold transition-all ${
                    ativo
                      ? "border-bola-500 bg-bola-500/80 text-white shadow-lg ring-2 ring-bola-500"
                      : "border-slate-600/60 bg-slate-700/50 text-slate-200 hover:border-quadra-600 hover:bg-slate-700/90"
                  } disabled:opacity-50`}
                >
                  <span className="text-[11px] font-medium opacity-80">
                    {ROTULO_QUADRANTE[quad].replace("Superior", "Sup.").replace("Inferior", "Inf.").replace("Médio", "Méd.")}
                  </span>
                  {ativo && <span className="mt-1 text-sm font-extrabold text-white">✓ Marcado</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Opções Fora e Trave */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {(["trave", "fora"] as QuadranteBaliza[]).map((quad) => {
            const ativo = selecionado === quad;
            return (
              <button
                type="button"
                key={quad}
                disabled={disabled}
                onClick={() => aoSelecionar(quad)}
                className={`rounded-md border py-2.5 text-xs font-semibold transition ${
                  ativo
                    ? "border-bola-500 bg-bola-500 text-white shadow"
                    : "border-linha bg-white text-tinta hover:bg-fundo"
                } disabled:opacity-50`}
              >
                {ROTULO_QUADRANTE[quad]}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Modo Heatmap / Visualização
  const { estatisticas } = props;
  const maxTotal = Math.max(...QUADRANTES_GOL.map((q) => estatisticas.porQuadrante[q].total), 1);

  function corCalor(totalNoQuadrante: number, golsNoQuadrante: number) {
    if (totalNoQuadrante === 0) return "bg-slate-800/40 text-slate-400 border-slate-700/50";
    const intensidade = totalNoQuadrante / maxTotal;

    if (intensidade > 0.65) {
      return "bg-rose-600/90 text-white border-rose-400 shadow-sm";
    }
    if (intensidade > 0.35) {
      return "bg-amber-500/85 text-white border-amber-300";
    }
    return "bg-blue-600/70 text-white border-blue-400";
  }

  return (
    <div className="w-full space-y-3">
      {/* Baliza Gráfica */}
      <div className="relative rounded-t-xl border-t-[10px] border-x-[10px] border-slate-700 bg-slate-900 p-2 shadow-md">
        <div
          className="grid grid-cols-3 gap-2 rounded bg-slate-950/80 p-1.5"
          style={{
            backgroundImage: "radial-gradient(#334155 1.5px, transparent 1.5px)",
            backgroundSize: "14px 14px",
          }}
        >
          {GRID_3X3.flat().map((quad) => {
            const qData = estatisticas.porQuadrante[quad];
            const estiloCor = corCalor(qData.total, qData.gols);
            const pct = qData.pctGol !== null ? `${Math.round(qData.pctGol * 100)}%` : "-";

            return (
              <div
                key={quad}
                className={`flex h-24 sm:h-28 flex-col items-center justify-center rounded border p-2 text-center transition ${estiloCor}`}
              >
                <span className="text-[10px] uppercase tracking-wide opacity-80">
                  {ROTULO_QUADRANTE[quad].replace("Superior", "Sup.").replace("Inferior", "Inf.").replace("Médio", "Méd.")}
                </span>
                <span className="mt-1 font-titulo text-2xl font-black">
                  {qData.total} {qData.total === 1 ? "tiro" : "tiros"}
                </span>
                <span className="text-[11px] font-semibold opacity-90">
                  {qData.gols} {qData.gols === 1 ? "gol" : "gols"} ({pct})
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fora e Trave Stats */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border border-linha bg-white p-3 text-center">
          <p className="text-suave">Acertou a Trave</p>
          <p className="font-titulo text-xl font-bold text-tinta">
            {estatisticas.porQuadrante.trave.total} vez(es)
          </p>
        </div>
        <div className="rounded-lg border border-linha bg-white p-3 text-center">
          <p className="text-suave">Finalizou Para Fora</p>
          <p className="font-titulo text-xl font-bold text-tinta">
            {estatisticas.porQuadrante.fora.total} vez(es)
          </p>
        </div>
      </div>
    </div>
  );
}
