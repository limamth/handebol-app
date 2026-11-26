"use client";

import { useState } from "react";
import { UserPlus, Search, CheckSquare, Square, Users, Zap, AlertCircle } from "lucide-react";
import { vincularAtletasExistentes, vincularTodosSemEquipa } from "@/app/(app)/equipas/actions";

interface AtletaDisponivel {
  id: string;
  nome: string;
  posicao?: string | null;
  ano_nascimento?: number | null;
  membros_equipa?: { equipa_id: string }[];
}

interface PainelIncluirAtletasEquipaProps {
  equipaId: string;
  equipaNome: string;
  atletasDisponiveis: AtletaDisponivel[];
}

export function PainelIncluirAtletasEquipa({
  equipaId,
  equipaNome,
  atletasDisponiveis,
}: PainelIncluirAtletasEquipaProps) {
  const [busca, setBusca] = useState("");
  const [apenasSemEquipa, setApenasSemEquipa] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [submetendo, setSubmetendo] = useState(false);

  // Atletas que não possuem nenhuma equipa
  const semEquipaTotal = atletasDisponiveis.filter(
    (a) => !a.membros_equipa || a.membros_equipa.length === 0
  );

  // Filtragem
  const filtrados = atletasDisponiveis.filter((a) => {
    const semEquipa = !a.membros_equipa || a.membros_equipa.length === 0;
    if (apenasSemEquipa && !semEquipa) return false;

    if (busca.trim()) {
      const termo = busca.toLowerCase();
      const nomeMatch = (a.nome || "").toLowerCase().includes(termo);
      const posMatch = (a.posicao || "").toLowerCase().includes(termo);
      return nomeMatch || posMatch;
    }
    return true;
  });

  const toggleSelecionar = (id: string) => {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selecionarTodosFiltrados = () => {
    const todosIds = filtrados.map((a) => a.id);
    const todosEstaoSelecionados = todosIds.every((id) => selecionados.includes(id));
    if (todosEstaoSelecionados) {
      setSelecionados((prev) => prev.filter((id) => !todosIds.includes(id)));
    } else {
      setSelecionados((prev) => Array.from(new Set([...prev, ...todosIds])));
    }
  };

  if (atletasDisponiveis.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-linha bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linha pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bola-100 text-bola-600">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-titulo text-lg font-bold text-tinta">
              Incluir Atletas Existentes na Equipa
            </h2>
            <p className="text-xs text-suave">
              Adicione atletas já cadastrados no clube (como os importados da planilha) a esta equipa.
            </p>
          </div>
        </div>

        {/* Botão rápido para vincular todos os sem equipa */}
        {semEquipaTotal.length > 0 && (
          <form
            action={async () => {
              if (
                confirm(
                  `Deseja incluir todos os ${semEquipaTotal.length} atleta(s) sem equipa na equipa "${equipaNome}"?`
                )
              ) {
                setSubmetendo(true);
                await vincularTodosSemEquipa(equipaId);
              }
            }}
          >
            <button
              type="submit"
              disabled={submetendo}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50"
            >
              <Zap className="h-4 w-4" />
              Incluir Todos os Sem Equipa ({semEquipaTotal.length})
            </button>
          </form>
        )}
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-suave" />
          <input
            type="text"
            placeholder="Buscar atleta por nome ou posição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-md border border-linha bg-fundo pl-9 pr-3 py-2 text-xs text-tinta focus:border-bola-500 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {semEquipaTotal.length > 0 && (
            <button
              type="button"
              onClick={() => setApenasSemEquipa(!apenasSemEquipa)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                apenasSemEquipa
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-fundo text-suave hover:text-tinta border border-linha"
              }`}
            >
              Apenas sem equipa ({semEquipaTotal.length})
            </button>
          )}

          <button
            type="button"
            onClick={selecionarTodosFiltrados}
            className="inline-flex items-center gap-1.5 rounded-md border border-linha bg-white px-3 py-1.5 text-xs font-semibold text-tinta hover:bg-cinza-50"
          >
            {filtrados.length > 0 && filtrados.every((a) => selecionados.includes(a.id)) ? (
              <>
                <Square className="h-3.5 w-3.5 text-suave" /> Desmarcar todos
              </>
            ) : (
              <>
                <CheckSquare className="h-3.5 w-3.5 text-bola-500" /> Marcar todos
              </>
            )}
          </button>
        </div>
      </div>

      {/* Formulário de inclusão dos selecionados */}
      <form
        action={vincularAtletasExistentes.bind(null, equipaId)}
        onSubmit={() => setSubmetendo(true)}
        className="space-y-4"
      >
        <div className="max-h-80 overflow-y-auto rounded-lg border border-linha divide-y divide-linha bg-white">
          {filtrados.length === 0 ? (
            <p className="p-4 text-center text-xs text-suave">
              Nenhum atleta encontrado com os filtros atuais.
            </p>
          ) : (
            filtrados.map((a) => {
              const semEquipa = !a.membros_equipa || a.membros_equipa.length === 0;
              const isChecked = selecionados.includes(a.id);

              return (
                <div
                  key={a.id}
                  onClick={() => toggleSelecionar(a.id)}
                  className={`flex items-center justify-between p-3 cursor-pointer transition ${
                    isChecked ? "bg-bola-50/60" : "hover:bg-fundo"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="atleta_ids"
                      value={a.id}
                      checked={isChecked}
                      onChange={() => {}} // controlado pelo onClick da div
                      className="h-4 w-4 rounded border-linha text-bola-500 focus:ring-bola-400"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-tinta">{a.nome}</span>
                        {semEquipa ? (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                            Sem equipa
                          </span>
                        ) : (
                          <span className="rounded bg-cinza-100 px-1.5 py-0.5 text-[10px] font-medium text-suave">
                            Em outra equipa
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-suave">
                        {a.posicao || "Posição não informada"}
                        {a.ano_nascimento ? ` · Nasc: ${a.ano_nascimento}` : ""}
                      </p>
                    </div>
                  </div>

                  {isChecked && (
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label className="text-[11px] font-medium text-suave">Camisa:</label>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        placeholder="Nº"
                        name={`camisa_${a.id}`}
                        className="w-16 rounded border border-linha bg-white px-2 py-1 text-xs text-center font-bold text-tinta focus:border-bola-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <span className="text-xs text-suave">
            <strong className="text-tinta">{selecionados.length}</strong> atleta(s) selecionado(s) de{" "}
            {atletasDisponiveis.length} disponíveis
          </span>

          <button
            type="submit"
            disabled={selecionados.length === 0 || submetendo}
            className="inline-flex items-center gap-2 rounded-lg bg-bola-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition disabled:opacity-40"
          >
            <UserPlus className="h-4 w-4" />
            {submetendo
              ? "Incluindo atletas..."
              : `Incluir ${selecionados.length || ""} Atleta(s) Selecionado(s)`}
          </button>
        </div>
      </form>
    </section>
  );
}
