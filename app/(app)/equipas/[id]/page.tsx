import Link from "next/link";
import { notFound } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import { Aviso } from "@/components/ui/Aviso";
import { POSICOES } from "@/lib/modalidade";
import { adicionarEmOutraEquipa, atualizarCamisa, atualizarEquipa, cadastrarAtleta, excluirEquipa, moverParaEquipa, removerDaEquipa } from "../actions";
import { PainelIncluirAtletasEquipa } from "@/components/equipas/PainelIncluirAtletasEquipa";

const campo = "mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5";

export default async function DetalheEquipa({ params, searchParams }: { params: { id: string }; searchParams: { erro?: string; aviso?: string } }) {
  const { supabase, perfil } = await obterPerfil();
  const editar = podeEditar(perfil.papel, "equipas");

  const { data: equipa } = await supabase.from("equipas").select("id, nome, categoria, genero").eq("id", params.id).single();
  if (!equipa) notFound();

  const [{ data: membros }, { data: outras }, { count: totalSessoes }, { data: todosAtletas }] = await Promise.all([
    supabase.from("membros_equipa").select("numero_camisa, usuarios(id, nome, posicao, ano_nascimento)").eq("equipa_id", params.id),
    supabase.from("equipas").select("id, nome").neq("id", params.id).order("nome"),
    supabase.from("sessoes").select("id", { count: "exact", head: true }).eq("equipa_id", params.id),
    supabase.from("usuarios").select("id, nome, posicao, ano_nascimento, membros_equipa(equipa_id)").eq("clube_id", perfil.clube_id).eq("papel", "atleta").eq("ativo", true).order("nome"),
  ]);

  const lista = ((membros ?? []) as any[])
    .map((m) => ({ ...m.usuarios, camisa: m.numero_camisa }))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const idsJaMembros = new Set(lista.map((a) => a.id));
  const atletasDisponiveis = ((todosAtletas ?? []) as any[]).filter((a) => !idsJaMembros.has(a.id));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Aviso key={Date.now()} mensagem={searchParams.erro ?? searchParams.aviso} tipo={searchParams.erro ? "erro" : "ok"} />
      <div>
        <Link href="/equipas" className="text-sm text-quadra-600 underline">Voltar para equipas</Link>
        <h1 className="font-titulo text-3xl font-bold">{equipa.nome}</h1>
        <p className="text-suave">{equipa.categoria}{equipa.genero ? ` · ${equipa.genero}` : ""}</p>
      </div>

      {editar && (
        <section className="rounded-lg border border-linha bg-white p-5">
          <details>
            <summary className="cursor-pointer font-titulo text-xl font-semibold">Editar equipa</summary>
            <form action={atualizarEquipa.bind(null, equipa.id)} className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium sm:col-span-2">Nome
                <input name="nome" required defaultValue={equipa.nome} className={campo} />
              </label>
              <label className="block text-sm font-medium">Categoria ou escalão
                <input name="categoria" required defaultValue={equipa.categoria} className={campo} />
              </label>
              <label className="block text-sm font-medium">Gênero
                <select name="genero" defaultValue={equipa.genero ?? ""} className={campo}>
                  <option value="">Não informar</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="misto">Misto</option>
                </select>
              </label>
              <div className="sm:col-span-2"><button className="rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90">Salvar alterações</button></div>
            </form>
            <details className="mt-5 text-sm">
              <summary className="cursor-pointer text-suave underline">Excluir equipa</summary>
              <form action={excluirEquipa.bind(null, equipa.id)} className="mt-2 max-w-md rounded-md bg-bola-100 p-3">
                <p>
                  Isto apaga a equipa{totalSessoes ? ` e as ${totalSessoes} sessões dela, com presenças, cargas e exercícios anexados` : ""}.
                  Os atletas continuam cadastrados, mas ficam sem equipa. Essa ação não pode ser desfeita.
                </p>
                <button className="mt-2 rounded-md bg-tinta px-3 py-1.5 text-white">Confirmar exclusão da equipa</button>
              </form>
            </details>
          </details>
        </section>
      )}

      <section className="overflow-x-auto rounded-lg border border-linha bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-linha text-suave">
            <tr>
              <th className="px-4 py-3 font-medium">Nº</th><th className="px-4 py-3 font-medium">Nome</th><th className="px-4 py-3 font-medium">Posição</th><th className="px-4 py-3 font-medium">Nascimento</th>
              {editar && <th className="px-4 py-3 font-medium">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-linha align-top">
            {lista.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-suave">Nenhum atleta nesta equipa ainda.</td></tr>}
            {lista.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3">{a.camisa ?? "-"}</td>
                <td className="px-4 py-3 font-medium"><Link href={`/atletas/${a.id}`} className="text-quadra-600 underline">{a.nome}</Link></td>
                <td className="px-4 py-3">{a.posicao ?? "-"}</td>
                <td className="px-4 py-3">{a.ano_nascimento ?? "-"}</td>
                {editar && (
                  <td className="px-4 py-3">
                    <details>
                      <summary className="cursor-pointer text-quadra-600 underline">Gerenciar</summary>
                      <form action={atualizarCamisa.bind(null, equipa.id, a.id)} className="mt-2 grid min-w-64 gap-3 rounded-md bg-fundo p-3">
                        <label className="block font-medium">Número da camisa
                          <input name="camisa" type="number" min={1} max={99} defaultValue={a.camisa ?? ""} className={campo} />
                        </label>
                        <button className="rounded-md bg-bola-500 px-4 py-2 font-semibold text-white hover:opacity-90">Salvar número</button>
                        {(outras ?? []).length > 0 && (
                          <>
                            <label className="block font-medium">Outra equipa
                              <select name="destino" defaultValue="" className={campo}>
                                <option value="">Escolha</option>
                                {(outras ?? []).map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                              </select>
                            </label>
                            <div className="flex flex-wrap gap-2">
                              <button formAction={moverParaEquipa.bind(null, equipa.id, a.id)} className="rounded-md border border-linha bg-white px-3 py-1.5 hover:bg-fundo">Mover para lá</button>
                              <button formAction={adicionarEmOutraEquipa.bind(null, equipa.id, a.id)} className="rounded-md border border-linha bg-white px-3 py-1.5 hover:bg-fundo">Adicionar também lá</button>
                            </div>
                          </>
                        )}
                        <button formAction={removerDaEquipa.bind(null, equipa.id, a.id)} formNoValidate className="text-left text-suave underline">Remover desta equipa</button>
                      </form>
                    </details>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {editar && atletasDisponiveis.length > 0 && (
        <PainelIncluirAtletasEquipa
          equipaId={equipa.id}
          equipaNome={equipa.nome}
          atletasDisponiveis={atletasDisponiveis}
        />
      )}

      {editar && (
        <details className="rounded-lg border border-linha bg-white p-5">
          <summary className="cursor-pointer font-titulo text-xl font-semibold">
            Cadastrar novo atleta (criar novo cadastro)
          </summary>
          <form action={cadastrarAtleta.bind(null, equipa.id)} className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium sm:col-span-2">Nome completo
              <input name="nome" required className={campo} />
            </label>
            <label className="block text-sm font-medium">Posição
              <select name="posicao" className={campo}>
                <option value="">Não informar</option>
                {POSICOES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">Ano de nascimento
              <input name="ano" type="number" min={1950} max={2020} className={campo} />
            </label>
            <label className="block text-sm font-medium">Número da camisa
              <input name="camisa" type="number" min={1} max={99} className={campo} />
            </label>
            <div className="sm:col-span-2 pt-2">
              <button className="rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90">
                Cadastrar e vincular à equipa
              </button>
            </div>
          </form>
        </details>
      )}
    </div>
  );
}
