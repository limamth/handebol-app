import Link from "next/link";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { exigirModuloAtivo } from "@/lib/configuracoes";
import { podeEditar, podeVer } from "@/lib/permissions";
import { Aviso } from "@/components/ui/Aviso";
import { POSICOES } from "@/lib/modalidade";
import type { EquipeAnalise } from "@/lib/analise-jogo";
import {
  adicionarAtletaEquipeAnalise,
  adicionarAtletasEquipeAnaliseEmLote,
  atualizarAtletaEquipeAnalise,
  atualizarEquipeAnalise,
  criarEquipeAnalise,
  excluirAtletaEquipeAnalise,
  excluirEquipeAnalise,
  importarEquipesDoScout,
} from "./actions";
import { ArrowLeft, Flag, ListPlus, Plus, RefreshCw, Shield, Trash2, UserPlus, Users } from "lucide-react";

export const metadata = {
  title: "Equipes de Análise | Handebol Hub",
};

const campo = "mt-1 w-full rounded-md border border-linha bg-white px-3 py-2 text-sm text-tinta";

export default async function PaginaEquipesAnalise({
  searchParams,
}: {
  searchParams: { filtro?: string; equipe?: string; aviso?: string; erro?: string };
}) {
  await exigirModuloAtivo("analise_jogo");
  const { supabase, perfil } = await obterPerfil();

  if (!podeVer(perfil.papel, "analise_jogo")) {
    redirect("/dashboard");
  }

  const editar = podeEditar(perfil.papel, "analise_jogo");

  const { data: equipesRaw } = await supabase
    .from("equipes_analise")
    .select("*, atletas_equipe_analise(id, nome, numero, posicao)")
    .eq("clube_id", perfil.clube_id)
    .order("nome");

  const todasEquipes = (equipesRaw ?? []) as EquipeAnalise[];
  const filtro = searchParams.filtro === "terceira" ? "terceira" : searchParams.filtro === "nossa" ? "nossa" : "todas";
  const equipesFiltradas = todasEquipes.filter((e) =>
    filtro === "todas" ? true : e.tipo === filtro
  );

  const equipeSelecionada =
    equipesFiltradas.find((e) => e.id === searchParams.equipe) ??
    todasEquipes.find((e) => e.id === searchParams.equipe) ??
    equipesFiltradas[0] ??
    null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Aviso
        key={Date.now()}
        mensagem={searchParams.erro ?? searchParams.aviso}
        tipo={searchParams.erro ? "erro" : "ok"}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/analise-jogo"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-suave hover:text-tinta"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Análise ao Vivo
        </Link>
      </div>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-quadra-900 text-white shadow-sm">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-titulo text-3xl font-bold text-tinta">Equipes da Análise ao Vivo</h1>
            <p className="text-sm text-suave">
              Equipes interligadas com o módulo Scout (suas seleções ou quaisquer 2 equipes terceiras), independentes das equipes principais do clube.
            </p>
          </div>
        </div>

        {editar && (
          <form action={importarEquipesDoScout}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg border border-linha bg-white px-3.5 py-2 text-xs font-semibold text-tinta shadow-sm hover:bg-fundo"
            >
              <RefreshCw className="h-3.5 w-3.5 text-bola-500" />
              Sincronizar Equipes do Scout
            </button>
          </form>
        )}
      </header>

      {/* Filtro rápido */}
      <div className="flex flex-wrap gap-2 border-b border-linha pb-2">
        <Link
          href="/analise-jogo/equipes"
          className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
            filtro === "todas"
              ? "bg-quadra-900 text-white"
              : "border border-linha bg-white text-suave hover:text-tinta"
          }`}
        >
          Todas ({todasEquipes.length})
        </Link>
        <Link
          href="/analise-jogo/equipes?filtro=nossa"
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
            filtro === "nossa"
              ? "bg-emerald-600 text-white"
              : "border border-linha bg-white text-suave hover:text-tinta"
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          Nossas / Brasil ({todasEquipes.filter((e) => e.tipo === "nossa").length})
        </Link>
        <Link
          href="/analise-jogo/equipes?filtro=terceira"
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
            filtro === "terceira"
              ? "bg-bola-500 text-white"
              : "border border-linha bg-white text-suave hover:text-tinta"
          }`}
        >
          <Flag className="h-3.5 w-3.5" />
          Adversárias / Terceiras ({todasEquipes.filter((e) => e.tipo === "terceira").length})
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna Esquerda: Lista e Criação */}
        <div className="space-y-4">
          <div className="rounded-xl border border-linha bg-white p-4 shadow-sm space-y-3">
            <h2 className="font-titulo text-base font-bold text-tinta">Equipes Cadastradas</h2>

            {equipesFiltradas.length === 0 ? (
              <p className="text-xs text-suave">Nenhuma equipe cadastrada ainda.</p>
            ) : (
              <ul className="space-y-1.5">
                {equipesFiltradas.map((e) => {
                  const ativa = equipeSelecionada?.id === e.id;
                  const qtd = (e.atletas_equipe_analise ?? []).length;
                  return (
                    <li key={e.id}>
                      <Link
                        href={`/analise-jogo/equipes?${filtro !== "todas" ? `filtro=${filtro}&` : ""}equipe=${e.id}`}
                        className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${
                          ativa
                            ? "bg-bola-500 text-white font-semibold shadow-sm"
                            : "bg-fundo text-tinta hover:bg-cinza-100"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate">
                            {e.tipo === "terceira" ? "🏳️ " : "🇧🇷 "}
                            {e.nome}
                          </p>
                          {e.categoria && (
                            <p className={`text-[11px] ${ativa ? "text-white/80" : "text-suave"}`}>
                              {e.categoria}
                            </p>
                          )}
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            ativa ? "bg-white/20 text-white" : "bg-white text-suave"
                          }`}
                        >
                          {qtd}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {editar && (
            <form
              action={criarEquipeAnalise}
              className="rounded-xl border border-linha bg-white p-4 shadow-sm space-y-3"
            >
              <h3 className="font-titulo text-base font-bold text-tinta flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-bola-500" />
                Nova Equipe (Independente)
              </h3>
              <label className="block text-xs font-semibold text-tinta">
                Nome da Equipe *
                <input name="nome" required placeholder="Ex.: Brasil Adulto, Argentina, Clube X" className={campo} />
              </label>
              <label className="block text-xs font-semibold text-tinta">
                Categoria / Torneio (opcional)
                <input name="categoria" placeholder="Ex.: Masculino, Mundial 2026" className={campo} />
              </label>
              <label className="block text-xs font-semibold text-tinta">
                Identificação
                <select name="tipo" defaultValue="nossa" className={campo}>
                  <option value="nossa">Nossa Equipe / Brasil</option>
                  <option value="terceira">Adversária / Equipe Terceira</option>
                </select>
              </label>
              <button
                type="submit"
                className="w-full rounded-lg bg-quadra-900 px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
              >
                Criar Equipe
              </button>
            </form>
          )}
        </div>

        {/* Coluna Direita: Elenco da Equipe Selecionada */}
        <div className="lg:col-span-2 space-y-4">
          {!equipeSelecionada ? (
            <div className="rounded-xl border border-dashed border-linha bg-white p-10 text-center text-sm text-suave">
              Crie ou selecione uma equipe ao lado para cadastrar o elenco de jogadores.
            </div>
          ) : (
            <div className="rounded-xl border border-linha bg-white p-5 shadow-sm space-y-5">
              {/* Cabeçalho + Edição */}
              <div className="border-b border-linha pb-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-titulo text-2xl font-bold text-tinta">
                      {equipeSelecionada.tipo === "terceira" ? "🏳️ " : "🇧🇷 "}
                      {equipeSelecionada.nome}
                    </h2>
                    <p className="text-xs text-suave">
                      {equipeSelecionada.categoria || "Sem categoria"} ·{" "}
                      {(equipeSelecionada.atletas_equipe_analise ?? []).length} atleta(s)
                    </p>
                  </div>

                  {editar && (
                    <form action={excluirEquipeAnalise.bind(null, equipeSelecionada.id)}>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir Equipe
                      </button>
                    </form>
                  )}
                </div>

                {editar && (
                  <details className="text-xs">
                    <summary className="cursor-pointer font-semibold text-quadra-700 hover:underline">
                      Editar informações desta equipe
                    </summary>
                    <form
                      action={atualizarEquipeAnalise.bind(null, equipeSelecionada.id)}
                      className="mt-2 grid gap-2 sm:grid-cols-4 items-end rounded-lg bg-fundo p-3"
                    >
                      <label className="block font-semibold">
                        Nome
                        <input
                          name="nome"
                          required
                          defaultValue={equipeSelecionada.nome}
                          className={campo}
                        />
                      </label>
                      <label className="block font-semibold">
                        Categoria
                        <input
                          name="categoria"
                          defaultValue={equipeSelecionada.categoria ?? ""}
                          className={campo}
                        />
                      </label>
                      <label className="block font-semibold">
                        Tipo
                        <select name="tipo" defaultValue={equipeSelecionada.tipo} className={campo}>
                          <option value="nossa">Nossa / Brasil</option>
                          <option value="terceira">Adversária / Terceira</option>
                        </select>
                      </label>
                      <button
                        type="submit"
                        className="rounded-md bg-quadra-900 px-3 py-2 font-semibold text-white"
                      >
                        Salvar
                      </button>
                    </form>
                  </details>
                )}
              </div>

              {/* Adicionar Atletas */}
              {editar && (
                <div className="space-y-3">
                  <form
                    action={adicionarAtletaEquipeAnalise.bind(null, equipeSelecionada.id)}
                    className="grid gap-3 rounded-lg border border-linha bg-fundo p-3 sm:grid-cols-12 items-end"
                  >
                    <label className="sm:col-span-2 block text-xs font-semibold text-tinta">
                      Nº
                      <input name="numero" type="number" min={1} max={99} placeholder="10" className={campo} />
                    </label>
                    <label className="sm:col-span-5 block text-xs font-semibold text-tinta">
                      Nome do Atleta *
                      <input name="nome" required placeholder="Nome ou apelido" className={campo} />
                    </label>
                    <label className="sm:col-span-3 block text-xs font-semibold text-tinta">
                      Posição
                      <select name="posicao" className={campo}>
                        <option value="">Opcional</option>
                        {POSICOES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center gap-1 rounded-md bg-bola-500 px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Add
                      </button>
                    </div>
                  </form>

                  <details className="rounded-lg border border-dashed border-linha p-3">
                    <summary className="cursor-pointer text-xs font-bold text-quadra-800 flex items-center gap-1.5">
                      <ListPlus className="h-4 w-4 text-bola-500" />
                      Cadastro Rápido em Lote (colar súmula / lista de atletas)
                    </summary>
                    <form
                      action={adicionarAtletasEquipeAnaliseEmLote.bind(null, equipeSelecionada.id)}
                      className="mt-3 space-y-2"
                    >
                      <p className="text-[11px] text-suave">
                        Um atleta por linha. Exemplos: <code>10 - João Silva</code>, <code>7 Lucas</code> ou apenas <code>Pedro</code>.
                      </p>
                      <textarea
                        name="lista"
                        rows={4}
                        required
                        placeholder={"1 - Goleiro\n7 - Ponta Esquerda\n10 - Especialista"}
                        className="w-full rounded-md border border-linha bg-white p-2.5 text-xs font-mono"
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-quadra-900 px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
                      >
                        Cadastrar Lista Completa
                      </button>
                    </form>
                  </details>
                </div>
              )}

              {/* Tabela de Elenco */}
              {(() => {
                const atletas = [...(equipeSelecionada.atletas_equipe_analise ?? [])].sort(
                  (a, b) => (a.numero ?? 999) - (b.numero ?? 999) || a.nome.localeCompare(b.nome)
                );

                return (
                  <div className="overflow-x-auto rounded-lg border border-linha">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-linha bg-fundo text-suave uppercase">
                        <tr>
                          <th className="px-3 py-2.5 w-16">Nº</th>
                          <th className="px-3 py-2.5">Nome</th>
                          <th className="px-3 py-2.5">Posição</th>
                          {editar && <th className="px-3 py-2.5 text-right">Ações</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-linha">
                        {atletas.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-6 text-center text-suave">
                              Nenhum atleta cadastrado nesta equipe ainda.
                            </td>
                          </tr>
                        ) : (
                          atletas.map((a) => (
                            <tr key={a.id} className="hover:bg-fundo/60">
                              <td className="px-3 py-2.5 font-bold text-quadra-900">{a.numero ?? "—"}</td>
                              <td className="px-3 py-2.5 font-semibold text-tinta">{a.nome}</td>
                              <td className="px-3 py-2.5 text-suave">{a.posicao ?? "—"}</td>
                              {editar && (
                                <td className="px-3 py-2.5 text-right">
                                  <div className="inline-flex items-center gap-2">
                                    <details className="relative inline-block text-left">
                                      <summary className="cursor-pointer text-[11px] font-semibold text-quadra-600 hover:underline">
                                        Editar
                                      </summary>
                                      <form
                                        action={atualizarAtletaEquipeAnalise.bind(
                                          null,
                                          equipeSelecionada.id,
                                          a.id
                                        )}
                                        className="mt-2 grid gap-2 rounded-lg border border-linha bg-fundo p-2.5 min-w-[210px]"
                                      >
                                        <input
                                          name="numero"
                                          type="number"
                                          defaultValue={a.numero ?? ""}
                                          placeholder="Nº"
                                          className="rounded border border-linha bg-white px-2 py-1 text-xs"
                                        />
                                        <input
                                          name="nome"
                                          required
                                          defaultValue={a.nome}
                                          className="rounded border border-linha bg-white px-2 py-1 text-xs"
                                        />
                                        <select
                                          name="posicao"
                                          defaultValue={a.posicao ?? ""}
                                          className="rounded border border-linha bg-white px-2 py-1 text-xs"
                                        >
                                          <option value="">Sem posição</option>
                                          {POSICOES.map((p) => (
                                            <option key={p} value={p}>
                                              {p}
                                            </option>
                                          ))}
                                        </select>
                                        <button
                                          type="submit"
                                          className="rounded bg-bola-500 px-2 py-1 text-xs font-semibold text-white"
                                        >
                                          Salvar
                                        </button>
                                      </form>
                                    </details>

                                    <form
                                      action={excluirAtletaEquipeAnalise.bind(
                                        null,
                                        equipeSelecionada.id,
                                        a.id
                                      )}
                                    >
                                      <button
                                        type="submit"
                                        className="rounded p-1 text-suave hover:bg-rose-50 hover:text-rose-600"
                                        title="Excluir atleta"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </form>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
