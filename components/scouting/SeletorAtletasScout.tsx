"use client";

import { useState, useTransition } from "react";
import { Check, Eye, Users, X } from "lucide-react";
import { salvarAtletasComAcessoScout } from "@/app/(app)/scout/actions";

export interface AtletaAcessoScout {
  id: string;
  nome: string;
  pode_ver_scout: boolean;
}

export function SeletorAtletasScout({
  atletasIniciais,
}: {
  atletasIniciais: AtletaAcessoScout[];
}) {
  const [aberto, setAberto] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>(
    atletasIniciais.filter((a) => a.pode_ver_scout).map((a) => a.id)
  );
  const [salvosCount, setSalvosCount] = useState(
    atletasIniciais.filter((a) => a.pode_ver_scout).length
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const alternar = (id: string) => {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const salvar = () => {
    startTransition(async () => {
      try {
        await salvarAtletasComAcessoScout(selecionados);
        setSalvosCount(selecionados.length);
        setFeedback("Permissões de acesso salvas!");
        setTimeout(() => {
          setFeedback(null);
          setAberto(false);
        }, 1200);
      } catch (err: any) {
        alert(
          "Erro ao salvar acesso ao Scout: " +
            err.message +
            "\n\nCertifique-se de ter executado a migração 031_scout_atletas_acesso.sql no Supabase."
        );
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-linha bg-white px-3.5 py-2.5 text-sm font-semibold text-tinta shadow-sm hover:bg-fundo transition"
        title="Selecionar quais atletas podem visualizar a tela de Scout"
      >
        <Eye className="h-4 w-4 text-quadra-700" />
        Acesso Atletas ({salvosCount}/{atletasIniciais.length})
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-linha bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-linha pb-2.5">
              <h3 className="font-titulo text-base font-bold text-tinta flex items-center gap-2">
                <Users className="h-4 w-4 text-quadra-700" />
                Atletas com Acesso ao Scout
              </h3>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="text-suave hover:text-tinta"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-suave">
              Apenas os atletas marcados abaixo verão o menu e a tela de <strong>Scout</strong>{" "}
              (em modo somente leitura).
            </p>

            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-tinta">
                {selecionados.length} selecionado(s)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelecionados(atletasIniciais.map((a) => a.id))}
                  className="font-semibold text-quadra-700 hover:underline"
                >
                  Selecionar todos
                </button>
                <span className="text-linha">|</span>
                <button
                  type="button"
                  onClick={() => setSelecionados([])}
                  className="font-semibold text-suave hover:underline"
                >
                  Limpar
                </button>
              </div>
            </div>

            {atletasIniciais.length === 0 ? (
              <p className="rounded-lg border border-dashed border-linha p-4 text-center text-xs text-suave">
                Nenhum atleta cadastrado neste clube.
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {atletasIniciais.map((atleta) => {
                  const marcado = selecionados.includes(atleta.id);
                  return (
                    <label
                      key={atleta.id}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${
                        marcado
                          ? "border-quadra-500 bg-quadra-50/70 font-semibold text-tinta"
                          : "border-linha bg-fundo/40 text-suave hover:bg-fundo"
                      }`}
                    >
                      <span>{atleta.nome}</span>
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => alternar(atleta.id)}
                        className="h-4 w-4 accent-quadra-700"
                      />
                    </label>
                  );
                })}
              </div>
            )}

            {feedback && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                <Check className="h-4 w-4" /> {feedback}
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-linha pt-3">
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="rounded-md border border-linha bg-white px-4 py-2 text-xs font-semibold text-suave"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={salvar}
                className="rounded-md bg-quadra-900 px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? "Salvando..." : "Salvar Acesso"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
