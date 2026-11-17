import Link from "next/link";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar, podeVer } from "@/lib/permissions";
import { CATEGORIAS_TESTE } from "@/lib/monitorizacao";
import { Aviso } from "@/components/ui/Aviso";
import { criarTeste, criarTestesSugeridos, excluirTeste } from "./actions";

const campo = "mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5";

export default async function Avaliacoes({ searchParams }: { searchParams: { erro?: string; aviso?: string } }) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeVer(perfil.papel, "avaliacoes")) redirect("/dashboard");
  const editar = podeEditar(perfil.papel, "avaliacoes");

  const { data: testes } = await supabase.from("definicoes_teste").select("id, nome, categoria, unidade, menor_e_melhor").order("nome");
  const grupos: Record<string, any[]> = {};
  (testes ?? []).forEach((t) => { (grupos[t.categoria ?? "Outro"] ??= []).push(t); });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-titulo text-3xl font-bold">Avaliações físicas</h1>
      <Aviso key={Date.now()} mensagem={searchParams.erro ?? searchParams.aviso} tipo={searchParams.erro ? "erro" : "ok"} />

      {(testes ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-linha bg-white p-6">
          <p className="text-suave">Nenhum teste cadastrado ainda.</p>
          {editar && (
            <form action={criarTestesSugeridos} className="mt-3">
              <button className="rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90">Adicionar testes sugeridos</button>
              <p className="mt-2 text-sm text-suave">Salto vertical e horizontal, sprint de 20 m, agilidade em T, bola medicinal e Yo-Yo. Você pode criar outros no formulário abaixo.</p>
            </form>
          )}
        </div>
      ) : (
        Object.entries(grupos).map(([categoria, lista]) => (
          <section key={categoria}>
            <h2 className="mb-2 font-titulo text-xl font-semibold">{categoria}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {lista.map((t) => (
                <li key={t.id}>
                  <Link href={`/avaliacoes/${t.id}`} className="block rounded-lg border border-linha bg-white p-4 hover:border-quadra-600">
                    <p className="font-medium">{t.nome}</p>
                    <p className="text-sm text-suave">{t.unidade}{t.menor_e_melhor ? " · menor é melhor" : ""}</p>
                  </Link>
                  {editar && (
                    <details className="mt-1 text-sm">
                      <summary className="cursor-pointer text-suave underline">Excluir teste</summary>
                      <form action={excluirTeste.bind(null, t.id)} className="mt-2 rounded-md bg-bola-100 p-3">
                        <p>Os resultados já registrados em “{t.nome}” também serão apagados. Essa ação não pode ser desfeita.</p>
                        <button className="mt-2 rounded-md bg-tinta px-3 py-1.5 text-white">Confirmar exclusão</button>
                      </form>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {editar && (
        <form action={criarTeste} className="grid max-w-2xl gap-4 rounded-lg border border-linha bg-white p-5 sm:grid-cols-2">
          <h2 className="font-titulo text-xl font-semibold sm:col-span-2">Novo teste</h2>
          <label className="block text-sm font-medium sm:col-span-2">Nome
            <input name="nome" required className={campo} placeholder="Ex.: Sprint de 10 m na areia" />
          </label>
          <label className="block text-sm font-medium">Categoria
            <select name="categoria" className={campo}>{CATEGORIAS_TESTE.map((c) => <option key={c}>{c}</option>)}</select>
          </label>
          <label className="block text-sm font-medium">Unidade
            <input name="unidade" required className={campo} placeholder="cm, s, kg, m..." />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input name="menor" type="checkbox" /> Quanto menor o valor, melhor o resultado (ex.: tempo de sprint)
          </label>
          <div className="sm:col-span-2"><button className="rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90">Criar teste</button></div>
        </form>
      )}
    </div>
  );
}
