"use client";

import { useState } from "react";
import { Shirt, X, Download } from "lucide-react";
import type { CampoCadastro, RegistroCadastral } from "@/lib/dados-atletas";

interface ModalResumoUniformesProps {
  atletas: any[];
  cadastros: Record<string, RegistroCadastral>;
  campos: CampoCadastro[];
}

export function ModalResumoUniformes({ atletas, cadastros, campos }: ModalResumoUniformesProps) {
  const [aberto, setAberto] = useState(false);

  // Campos de uniformes
  const camposUniformes = campos.filter((c) => c.categoria === "uniformes");

  // Conta tamanhos por item
  const contagemPorItem: Record<string, Record<string, number>> = {};

  camposUniformes.forEach((c) => {
    contagemPorItem[c.chave] = {};
    atletas.forEach((atleta) => {
      const reg = cadastros[atleta.id];
      const tam = reg?.valores?.[c.chave];
      if (tam && String(tam).trim() !== "") {
        const val = String(tam).trim().toUpperCase();
        contagemPorItem[c.chave][val] = (contagemPorItem[c.chave][val] || 0) + 1;
      }
    });
  });

  const exportarResumoCsv = () => {
    let csv = "Item de Uniforme;Tamanho;Quantidade\n";
    camposUniformes.forEach((c) => {
      const contagens = contagemPorItem[c.chave] || {};
      Object.entries(contagens).forEach(([tam, qtd]) => {
        csv += `"${c.rotulo}";"${tam}";${qtd}\n`;
      });
    });

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `resumo_tamanhos_uniformes_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-linha bg-white px-3 py-2 text-sm font-medium text-tinta shadow-sm hover:bg-cinza-50"
      >
        <Shirt className="h-4 w-4 text-bola-500" />
        Resumo de Uniformes
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl border border-linha bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-linha px-5 py-4">
              <div>
                <h3 className="font-titulo text-lg font-bold text-tinta flex items-center gap-2">
                  <Shirt className="h-5 w-5 text-bola-500" />
                  Resumo Geral de Tamanhos de Uniformes
                </h3>
                <p className="text-xs text-suave">
                  Contagem consolidada de tamanhos de todo o grupo (ideal para confecção e pedidos de uniformes).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="rounded-full p-1.5 text-suave hover:bg-cinza-100 hover:text-tinta"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex justify-end px-5 py-2.5 border-b border-linha bg-fundo">
              <button
                type="button"
                onClick={exportarResumoCsv}
                className="inline-flex items-center gap-1.5 rounded-md bg-white border border-linha px-3 py-1.5 text-xs font-semibold text-tinta shadow-sm hover:bg-cinza-50"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar Resumo (CSV)
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {camposUniformes.map((c) => {
                  const contagens = contagemPorItem[c.chave] || {};
                  const entradas = Object.entries(contagens).sort(([a], [b]) => a.localeCompare(b));
                  const total = Object.values(contagens).reduce((a, b) => a + b, 0);

                  return (
                    <div key={c.chave} className="rounded-lg border border-linha bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between border-b border-linha pb-2 mb-2">
                        <span className="font-semibold text-sm text-tinta">{c.rotulo}</span>
                        <span className="text-xs font-medium text-suave">{total} informados</span>
                      </div>

                      {entradas.length === 0 ? (
                        <p className="text-xs text-suave italic">Nenhum tamanho informado</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {entradas.map(([tam, qtd]) => (
                            <span
                              key={tam}
                              className="inline-flex items-center gap-1.5 rounded bg-fundo border border-linha px-2.5 py-1 text-xs font-medium text-tinta"
                            >
                              <strong className="text-bola-600">{tam}:</strong>
                              <span>{qtd} un</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
