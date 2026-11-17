import Link from "next/link";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import { criarEquipa } from "./actions";
import { Aviso } from "@/components/ui/Aviso";

const campo = "mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5";

export default async function Equipas({ searchParams }: { searchParams: { erro?: string; aviso?: string } }) {
  const { supabase, perfil } = await obterPerfil();
  const { data: equipas } = await supabase
    .from("equipas")
    .select("id, nome, categoria, genero, membros_equipa(count)")
    .order("nome");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-titulo text-3xl font-bold">Equipas</h1>

      <Aviso key={Date.now()} mensagem={searchParams.erro ?? searchParams.aviso} tipo={searchParams.erro ? "erro" : "ok"} />

      {equipas && equipas.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {equipas.map((e: any) => (
            <li key={e.id}>
              <Link href={`/equipas/${e.id}`} className="block rounded-lg border border-linha bg-white p-5 hover:border-quadra-600">
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
