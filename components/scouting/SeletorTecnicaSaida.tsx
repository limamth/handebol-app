"use client";

import { ROTULO_TECNICA_SAIDA, type TecnicaSaida, type EstatisticasSaida } from "@/lib/scouting";

interface PropsSelecao {
  modo: "selecao";
  selecionada: TecnicaSaida | null;
  aoSelecionar: (tecnica: TecnicaSaida) => void;
  disabled?: boolean;
}

interface PropsVisualizacao {
  modo: "visualizacao";
  estatisticas: EstatisticasSaida;
}

type Props = PropsSelecao | PropsVisualizacao;

export function SeletorTecnicaSaida(props: Props) {
  const ICONES: Record<TecnicaSaida, string> = {
    aerea: "🛫",
    costela: "⚡",
    cobertura: "🪂",
    deita_corpo: "🥋",
    fuga: "🏃",
  };

  if (props.modo === "selecao") {
    const { selecionada, aoSelecionar, disabled } = props;

    return (
      <div className="w-full space-y-2 select-none">
        <p className="text-xs font-semibold uppercase tracking-wider text-suave">
          Forma que o atacante bateu contra o goleiro saindo
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.entries(ROTULO_TECNICA_SAIDA) as [TecnicaSaida, { rotulo: string; desc: string }][]).map(
            ([chave, info]) => {
              const ativo = selecionada === chave;
              return (
                <button
                  type="button"
                  key={chave}
                  disabled={disabled}
                  onClick={() => aoSelecionar(chave)}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                    ativo
                      ? "border-bola-500 bg-bola-100/60 ring-2 ring-bola-500"
                      : "border-linha bg-white hover:border-quadra-600 hover:bg-fundo"
                  } disabled:opacity-50`}
                >
                  <span className="text-2xl" role="img" aria-hidden="true">
                    {ICONES[chave]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium ${ativo ? "text-bola-700 font-bold" : "text-tinta"}`}>
                      {info.rotulo}
                    </p>
                    <p className="text-xs text-suave line-clamp-2">{info.desc}</p>
                  </div>
                  {ativo && <span className="font-bold text-bola-500 text-sm">✓</span>}
                </button>
              );
            }
          )}
        </div>
      </div>
    );
  }

  // Modo Visualização / Estatísticas
  const { estatisticas } = props;

  return (
    <div className="w-full space-y-3">
      <div className="space-y-2">
        {(Object.entries(ROTULO_TECNICA_SAIDA) as [TecnicaSaida, { rotulo: string; desc: string }][]).map(
          ([chave, info]) => {
            const data = estatisticas.porTecnica[chave];
            const pctFreq = Math.round(data.pctFrequencia * 100);
            const pctEfic = data.pctEficacia !== null ? `${Math.round(data.pctEficacia * 100)}%` : "-";
            const ehPredominante = estatisticas.tecnicaPredominante === chave && data.total > 0;

            return (
              <div
                key={chave}
                className={`rounded-lg border p-3 transition ${
                  ehPredominante ? "border-amber-300 bg-amber-50/70" : "border-linha bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{ICONES[chave]}</span>
                    <div>
                      <p className="font-medium text-tinta text-sm">
                        {info.rotulo}
                        {ehPredominante && (
                          <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 uppercase">
                            Mais usada
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-suave">{data.total} batida(s) · {pctFreq}% do total</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-titulo text-lg font-bold text-tinta">
                      {data.gols} gol(s)
                    </p>
                    <p className="text-xs text-suave">Aprov: {pctEfic}</p>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full ${ehPredominante ? "bg-amber-500" : "bg-quadra-600"}`}
                    style={{ width: `${pctFreq}%` }}
                  />
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}
