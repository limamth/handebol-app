import Link from "next/link";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import { criarEquipa, vincularTodosSemEquipa } from "./actions";
import { Aviso } from "@/components/ui/Aviso";
import { Users, AlertTriangle } from "lucide-react";

const campo = "mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5";

export default async function Equipas({ searchParams }: { searchParams: { erro?: string; aviso?: string } }) {
  const { supabase, perfil } = await obterPerfil();
  const [{ data: equipas }, { data: todosAtletas }] = await Promise.all([
    supabase
      .from("equipas")
      .select("id, nome, categoria, genero, membros_equipa(count)")
      .order("nome"),
    supabase
      .from("usuarios")
      .select("id, nome, membros_equipa(equipa_id)")
      .eq("clube_id", perfil.clube_id)
      .eq("papel", "atleta")
      .eq("ativo", true),
  ]);

  const atletasSemEquipa = ((todosAtletas ?? []) as any[]).filter(
    (a) => !a.membros_equipa || a.membros_equipa.length === 0
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-titulo text-3xl font-bold">Equipas</h1>

      <Aviso key={Date.now()} mensagem={searchParams.erro ?? searchParams.aviso} tipo={searchParams.erro ? "erro" : "ok"} />

      {/* Alerta de Atletas Sem Equipa com Ação Rápida */}
      {podeEditar(perfil.papel, "equipas") && atletasSemEquipa.length > 0 && equipas && equipas.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white font-bold">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm text-tinta">
                {atletasSemEquipa.length} atleta(s) cadastrado(s) sem equipa
              </p>
              <p className="text-xs text-suave">
                Você pode vinculá-los a uma equipa abaixo ou entrar na equipa desejada para selecionar atletas individualmente.
              </p>
            </div>
          </div>

          <form
            action={async (formData: FormData) => {
              "use server";
              const destino = String(formData.get("equipa_id"));
              if (destino) {
                await vincularTodosSemEquipa(destino);
              }
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <select
              name="equipa_id"
              required
              className="rounded-md border border-linha bg-white px-3 py-1.5 text-xs text-tinta font-medium"
            >
              <option value="">Escolha a equipa de destino...</option>
              {equipas.map((e: any) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 transition"
            >
              Vincular todos a esta equipa
            </button>
          </form>
        </div>
      )}

      {equipas && equipas.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {equipas.map((e: any) => (
            <li key={e.id}>
              <Link href={`/equipas/${e.id}`} className="block rounded-lg border border-linha bg-white p-5 hover:border-quadra-600 transition">
                <p className="font-titulo text-xl font-semibold">{e.nome}</p>
                <p className="text-sm text-suave">{e.categoria}{e.genero ? ` · ${e.genero}` : ""}</p>
                <p className="mt-3 text-sm">{e.membros_equipa?.[0]?.count ?? 0} atletas</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-linha bg-white p-6 text-suave">Nenhuma equipa ainda. Crie a primeira no formulário abaixo.</p>
      )}

      {podeEditar(perfil.papel, "equipas") && (
        <form action={criarEquipa} className="max-w-md space-y-4 rounded-lg border border-linha bg-white p-5">
          <h2 className="font-titulo text-xl font-semibold">Nova equipa</h2>
          <label className="block text-sm font-medium">Nome
            <input name="nome" required placeholder="Ex.: Adulto masculino" className={campo} />
          </label>
          <label className="block text-sm font-medium">Categoria ou escalão
            <input name="categoria" required placeholder="Ex.: Sub-19, Adulto, Mirim" className={campo} />
          </label>
          <label className="block text-sm font-medium">Gênero
            <select name="genero" className={campo}>
              <option value="">Não informar</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
              <option value="misto">Misto</option>
            </select>
          </label>
          <button className="rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90">Criar equipa</button>
        </form>
      )}
    </div>
  );
}
