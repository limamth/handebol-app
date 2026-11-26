"use client";

import { useState } from "react";
import { Plus, Trash2, Settings2, X, AlertCircle, Camera } from "lucide-react";
import { CATEGORIAS_CAMPOS, type CampoCadastro, type CategoriaCampo, type TipoCampo } from "@/lib/dados-atletas";
import { criarCampoCustomizado, excluirCampoCustomizado } from "@/app/(app)/dados/actions";

interface ModalGerenciarCamposProps {
  campos: CampoCadastro[];
}

export function ModalGerenciarCampos({ campos }: ModalGerenciarCamposProps) {
  const [aberto, setAberto] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoCampo>("texto");
  const [aba, setAba] = useState<"novo" | "listar">("novo");

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-linha bg-white px-3 py-2 text-sm font-medium text-tinta shadow-sm hover:bg-cinza-50"
      >
        <Settings2 className="h-4 w-4 text-suave" />
        Gerenciar Campos
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl border border-linha bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-linha px-5 py-4">
              <div>
                <h3 className="font-titulo text-lg font-bold text-tinta">Campos do Banco de Dados</h3>
                <p className="text-xs text-suave">Crie novos campos personalizados ou gerencie os campos existentes.</p>
              </div>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="rounded-full p-1.5 text-suave hover:bg-cinza-100 hover:text-tinta"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Abas */}
            <div className="flex border-b border-linha bg-fundo px-5 pt-2">
              <button
                type="button"
                onClick={() => setAba("novo")}
                className={`border-b-2 px-4 py-2 text-sm font-semibold transition ${
                  aba === "novo" ? "border-bola-500 text-bola-600" : "border-transparent text-suave hover:text-tinta"
                }`}
              >
                + Criar Novo Campo
              </button>
              <button
                type="button"
                onClick={() => setAba("listar")}
                className={`border-b-2 px-4 py-2 text-sm font-semibold transition ${
                  aba === "listar" ? "border-bola-500 text-bola-600" : "border-transparent text-suave hover:text-tinta"
                }`}
              >
                Lista de Campos ({campos.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {aba === "novo" ? (
                <form action={criarCampoCustomizado} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-tinta">
                      Nome / Rótulo do Campo <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="rotulo"
                      required
                      placeholder="Ex: Tamanho do Colete, Nº do Título, etc."
                      className="mt-1 w-full rounded-md border border-linha bg-white px-3 py-2 text-sm text-tinta focus:border-bola-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-tinta">Categoria</label>
                      <select
                        name="categoria"
                        defaultValue="outros"
                        className="mt-1 w-full rounded-md border border-linha bg-white px-3 py-2 text-sm text-tinta focus:border-bola-500 focus:outline-none"
                      >
                        {CATEGORIAS_CAMPOS.map((c) => (
                          <option key={c.chave} value={c.chave}>
                            {c.rotulo}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-tinta">Tipo de Dado</label>
                      <select
                        name="tipo"
                        value={tipoSelecionado}
                        onChange={(e) => setTipoSelecionado(e.target.value as TipoCampo)}
                        className="mt-1 w-full rounded-md border border-linha bg-white px-3 py-2 text-sm text-tinta focus:border-bola-500 focus:outline-none"
                      >
                        <option value="texto">Texto Curto / Livre</option>
                        <option value="data">Data (DD/MM/AAAA)</option>
                        <option value="numero">Número</option>
                        <option value="selecao">Seleção (opções pré-definidas)</option>
                      </select>
                    </div>
                  </div>

                  {tipoSelecionado === "selecao" && (
                    <div className="rounded-lg border border-linha bg-fundo p-3">
                      <label className="block text-xs font-semibold text-tinta">
                        Opções da Seleção (separadas por vírgula ou ponto-e-vírgula)
                      </label>
                      <input
                        name="opcoes"
                        required
                        placeholder="Ex: PP, P, M, G, GG ou Sim, Não"
                        className="mt-1 w-full rounded-md border border-linha bg-white px-3 py-2 text-sm text-tinta focus:border-bola-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="rounded-lg border border-linha bg-cinza-50 p-4 space-y-3">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        name="permite_foto"
                        value="1"
                        className="mt-0.5 h-4 w-4 rounded border-linha text-bola-500 focus:ring-bola-400"
                      />
                      <div>
                        <span className="text-sm font-semibold text-tinta flex items-center gap-1.5">
                          <Camera className="h-4 w-4 text-bola-500" />
                          Permitir anexo / upload de foto neste campo
                        </span>
                        <p className="text-xs text-suave">
                          Permite que o atleta ou a comissão técnica anexe foto de comprovante, carteirinha ou foto do item.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        name="obrigatorio"
                        value="1"
                        className="mt-0.5 h-4 w-4 rounded border-linha text-bola-500 focus:ring-bola-400"
                      />
                      <div>
                        <span className="text-sm font-semibold text-tinta">Campo obrigatório</span>
                        <p className="text-xs text-suave">Exigir preenchimento obrigatório ao cadastrar ou editar.</p>
                      </div>
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setAberto(false)}
                      className="rounded-md border border-linha bg-white px-4 py-2 text-sm font-medium text-suave hover:bg-cinza-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-md bg-bola-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                    >
                      <Plus className="h-4 w-4" />
                      Criar Campo
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-suave">
                    Estes são todos os campos cadastrais ativos no clube. Você pode excluir campos criados caso não sejam mais necessários.
                  </p>
                  <div className="divide-y divide-linha rounded-lg border border-linha bg-white">
                    {campos.map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-3 hover:bg-fundo">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-tinta">{c.rotulo}</span>
                            <span className="rounded bg-cinza-100 px-1.5 py-0.5 text-[10px] font-medium text-suave uppercase">
                              {c.categoria}
                            </span>
                            {c.permite_foto && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                                <Camera className="h-3 w-3" /> Foto
                              </span>
                            )}
                            {c.obrigatorio && (
                              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                Obrigatório
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-suave mt-0.5">
                            Tipo: <strong className="text-tinta">{c.tipo}</strong> | Chave: <code className="text-[11px] text-gray-500">{c.chave}</code>
                            {c.opcoes && c.opcoes.length > 0 && ` (${c.opcoes.length} opções)`}
                          </p>
                        </div>

                        {/* Botão de exclusão (se tiver id do banco) */}
                        {c.id && !c.id.startsWith("padrao-") && (
                          <form
                            action={async () => {
                              if (confirm(`Deseja realmente excluir o campo "${c.rotulo}"?`)) {
                                await excluirCampoCustomizado(c.id);
                              }
                            }}
                          >
                            <button
                              type="submit"
                              className="rounded p-1.5 text-suave hover:bg-red-50 hover:text-red-600"
                              title="Excluir este campo"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </form>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
