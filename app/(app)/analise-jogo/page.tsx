import Link from "next/link";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { exigirModuloAtivo } from "@/lib/configuracoes";
import { podeEditar, podeVer } from "@/lib/permissions";
import { Aviso } from "@/components/ui/Aviso";
import {
  FASES_PARTIDA,
  calcularSetsVencidos,
  obterNomeEquipeA,
  obterNomeEquipeB,
  type EquipeAnalise,
  type PartidaAnalise,
} from "@/lib/analise-jogo";
import { criarPartidaAnalise, excluirPartidaAnalise } from "./actions";
import { Radio, BarChart3, Play, Trophy, Plus, Trash2, Users } from "lucide-react";

export const metadata = {
  title: "Análise de Jogo ao Vivo | BH Hub",
};

const campo = "mt-1 w-full rounded-md border border-linha bg-white px-3 py-2 text-sm";

export default async function PaginaAnaliseJogo({
  searchParams,
}: {
  searchParams: { aviso?: string; erro?: string; equipe?: string };
}) {
  await exigirModuloAtivo("analise_jogo");
  const { supabase, perfil } = await obterPerfil();

  if (!podeVer(perfil.papel, "analise_jogo")) {
    redirect("/dashboard?erro=" + encodeURIComponent("Sem acesso ao módulo de Análise de Jogo."));
  }

  const editar = podeEditar(perfil.papel, "analise_jogo");

  const [{ data: equipesAnalise }, { data: partidas }] = await Promise.all([
    supabase
      .from("equipes_analise")
      .select("id, nome, categoria, tipo")
      .eq("clube_id", perfil.clube_id)
      .order("nome"),
    supabase
      .from("partidas_analise")
      .select("*, equipas(id, nome, categoria)")
      .eq("clube_id", perfil.clube_id)
      .order("data_partida", { ascending: false })
      .order("criado_em", { ascending: false }),
  ]);

  const listaEquipes = (equipesAnalise ?? []) as EquipeAnalise[];
  const listaPartidas = ((partidas ?? []) as PartidaAnalise[]).filter((p) =>
    searchParams.equipe
      ? p.equipe_a_id === searchParams.equipe || p.equipe_b_id === searchParams.equipe
      : true
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Aviso
        key={Date.now()}
        mensagem={searchParams.erro ?? searchParams.aviso}
        tipo={searchParams.erro ? "erro" : "ok"}
      />

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bola-500 text-white shadow-sm">
            <Radio className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-titulo text-3xl font-bold text-tinta">Análise de Jogo ao Vivo</h1>
            <p className="text-sm text-suave">
              Registre lances ao vivo de qualquer confronto (inclusive 2 equipes terceiras) com equipes independentes.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/analise-jogo/equipes"
            className="inline-flex items-center gap-2 rounded-lg border border-linha bg-white px-4 py-2 text-sm font-semibold text-tinta shadow-sm hover:bg-fundo"
          >
            <Users className="h-4 w-4 text-quadra-700" />
            Gerir Equipes
          </Link>

          <Link
            href="/analise-jogo/acumulados"
            className="inline-flex items-center gap-2 rounded-lg border border-linha bg-white px-4 py-2 text-sm font-semibold text-tinta shadow-sm hover:bg-fundo"
          >
            <Trophy className="h-4 w-4 text-bola-500" />
            Acumulados
          </Link>
        </div>
      </header>

      {/* Nova Partida ao Vivo */}
      {editar && (
        <section className="rounded-xl border border-linha bg-white p-5 shadow-sm">
          <details open={listaPartidas.length === 0}>
            <summary className="cursor-pointer font-titulo text-lg font-bold text-tinta flex items-center gap-2">
              <Plus className="h-5 w-5 text-bola-500" />
              Iniciar Nova Análise ao Vivo
            </summary>

            <form action={criarPartidaAnalise} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-xs font-semibold text-tinta">
                Equipe A (Cadastrada)
                <select name="equipe_a_id" className={campo}>
                  <option value="">Digitar nome livre ao lado</option>
                  {listaEquipes.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.tipo === "terceira" ? "🏳️ " : "🇧🇷 "}
                      {e.nome} {e.categoria ? `(${e.categoria})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-semibold text-tinta">
                Nome da Equipe A (se não cadastrada)
                <input name="equipe_a_nome" placeholder="Ex.: Brasil, Seleção A..." className={campo} />
              </label>

              <label className="block text-xs font-semibold text-tinta">
                Equipe B (Cadastrada)
                <select name="equipe_b_id" className={campo}>
                  <option value="">Digitar nome livre ao lado</option>
                  {listaEquipes.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.tipo === "terceira" ? "🏳️ " : "🇧🇷 "}
                      {e.nome} {e.categoria ? `(${e.categoria})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-semibold text-tinta">
                Nome da Equipe B (se não cadastrada)
                <input name="equipe_b_nome" placeholder="Ex.: Argentina, Espanha..." className={campo} />
              </label>

              <label className="block text-xs font-semibold text-tinta sm:col-span-2">
                Competição
                <input
                  name="competicao"
                  placeholder="Ex.: Mundial, Circuito Brasileiro, Amistoso"
                  className={campo}
                />
              </label>

              <label className="block text-xs font-semibold text-tinta">
                Fase
                <select name="fase" defaultValue="Grupos" className={campo}>
                  {FASES_PARTIDA.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-semibold text-tinta">
                Data
                <input
                  name="data_partida"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className={campo}
                />
              </label>

              <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-2 pt-1">
                <Link
                  href="/analise-jogo/equipes"
                  className="text-xs font-semibold text-quadra-700 hover:underline"
                >
                  + Cadastrar equipes e elencos independentes
                </Link>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-bola-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                >
                  <Play className="h-4 w-4" />
                  Iniciar Análise ao Vivo
                </button>
              </div>
            </form>
          </details>
        </section>
      )}

      {/* Filtro por Equipe */}
      {listaEquipes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/analise-jogo"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              !searchParams.equipe
                ? "bg-quadra-900 text-white"
                : "border border-linha bg-white text-suave hover:text-tinta"
            }`}
          >
            Todas as Equipes
          </Link>
          {listaEquipes.map((e) => (
            <Link
              key={e.id}
              href={`/analise-jogo?equipe=${e.id}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                searchParams.equipe === e.id
                  ? "bg-quadra-900 text-white"
                  : "border border-linha bg-white text-suave hover:text-tinta"
              }`}
            >
              {e.nome}
            </Link>
          ))}
        </div>
      )}

      {/* Lista de Partidas */}
      {listaPartidas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-linha bg-white p-10 text-center text-sm text-suave">
          Nenhuma análise de partida registrada ainda. Inicie a primeira acima!
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {listaPartidas.map((p) => {
            const sets = calcularSetsVencidos(p);
            const nomeA = obterNomeEquipeA(p);
            const nomeB = obterNomeEquipeB(p);
            const aoVivo = p.status === "ao_vivo";

            return (
              <div
                key={p.id}
                className="rounded-xl border border-linha bg-white p-5 shadow-sm flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      {aoVivo ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 font-bold text-rose-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                          AO VIVO
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800">
                          Finalizada
                        </span>
                      )}
                      {p.fase && (
                        <span className="rounded bg-cinza-100 px-2 py-0.5 font-medium text-suave">
                          {p.fase}
                        </span>
                      )}
                    </div>
                    <span className="text-suave">{p.data_partida}</span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 items-center text-center gap-2">
                    <p className="font-titulo text-base font-bold text-tinta truncate">{nomeA}</p>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-suave">SETS</p>
                      <p className="font-titulo text-2xl font-extrabold text-tinta">
                        {sets.nos} × {sets.adv}
                      </p>
                    </div>
                    <p className="font-titulo text-base font-bold text-tinta truncate">{nomeB}</p>
                  </div>

                  <div className="mt-2 flex justify-center gap-3 text-xs text-suave">
                    <span>1º Set: {p.set1_nos}×{p.set1_adv}</span>
                    <span>2º Set: {p.set2_nos}×{p.set2_adv}</span>
                    {(p.shootout_nos > 0 || p.shootout_adv > 0) && (
                      <span>SO: {p.shootout_nos}×{p.shootout_adv}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-linha pt-3">
                  <div className="flex items-center gap-2">
                    {aoVivo && editar && (
                      <Link
                        href={`/analise-jogo/${p.id}`}
                        className="inline-flex items-center gap-1.5 rounded-md bg-bola-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Registrar ao Vivo
                      </Link>
                    )}

                    <Link
                      href={`/analise-jogo/${p.id}/estatisticas`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-linha bg-fundo px-3 py-1.5 text-xs font-semibold text-tinta hover:bg-cinza-100"
                    >
                      <BarChart3 className="h-3.5 w-3.5 text-quadra-600" />
                      {aoVivo ? "Acompanhar ao Vivo" : "Ver Estatísticas"}
                    </Link>
                  </div>

                  {editar && (
                    <form action={excluirPartidaAnalise.bind(null, p.id)}>
                      <button
                        type="submit"
                        className="rounded p-1.5 text-suave hover:bg-rose-50 hover:text-rose-600"
                        title="Excluir partida"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
