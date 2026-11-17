import Link from "next/link";
import { notFound } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar, podeVer } from "@/lib/permissions";
import { Aviso } from "@/components/ui/Aviso";
import { BotaoImprimir } from "@/components/ui/BotaoImprimir";
import { POSICOES } from "@/lib/modalidade";
import { atualizarAtleta, excluirAtleta, gerarConvite, atualizarBemEstar, excluirBemEstar, atualizarResultadoTeste, excluirResultadoTeste } from "../actions";
import { mediaRespostas, fmt1, PERGUNTAS_BEM_ESTAR, NOME_QUESTIONARIO } from "@/lib/monitorizacao";
import { dataCurta, hojeChave } from "@/lib/periodo";

export default async function FichaAtleta({ params, searchParams }: { params: { id: string }; searchParams: { aviso?: string; erro?: string } }) {
  const { supabase, perfil } = await obterPerfil();

  const { data: atleta } = await supabase
    .from("usuarios")
    .select("id, nome, posicao, ano_nascimento, ativo, auth_id, membros_equipa(numero_camisa, equipas(id, nome))")
    .eq("id", params.id).eq("papel", "atleta").single();
  if (!atleta) notFound();

  const editarBemEstar = podeEditar(perfil.papel, "monitorizacao");
  const editarTestes = podeEditar(perfil.papel, "avaliacoes");
  const { data: questionarios } = editarBemEstar
    ? await supabase.from("questionarios").select("perguntas").eq("nome", NOME_QUESTIONARIO).limit(1)
    : { data: null };
  const perguntas = (questionarios?.[0]?.perguntas ?? PERGUNTAS_BEM_ESTAR) as typeof PERGUNTAS_BEM_ESTAR;

  const comissaoConvida = ["gestor", "comissao_tecnica"].includes(perfil.papel);
  const { data: convite } = comissaoConvida && !atleta.auth_id
    ? await supabase.from("convites").select("codigo").eq("usuario_id", params.id).maybeSingle()
    : { data: null };

  const vazio = { data: [] as any[] };
  const [{ data: cargas }, { data: bemEstar }, { data: marcas }] = podeVer(perfil.papel, "monitorizacao")
    ? await Promise.all([
        supabase.from("rpe_sessao").select("rpe, minutos, carga_ua, sessoes(titulo, inicio)").eq("atleta_id", params.id).order("registrado_em", { ascending: false }).limit(5),
        supabase.from("respostas_questionario").select("id, dia, respostas").eq("atleta_id", params.id).order("dia", { ascending: false }).limit(7),
        supabase.from("resultados_teste").select("id, valor, medido_em, definicoes_teste(nome, unidade)").eq("atleta_id", params.id).order("medido_em", { ascending: false }).limit(8),
      ])
    : [vazio, vazio, vazio];

  const idade = atleta.ano_nascimento ? new Date().getFullYear() - atleta.ano_nascimento : null;
  const vinculos = (atleta.membros_equipa ?? []) as any[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Aviso key={Date.now()} mensagem={searchParams.erro ?? searchParams.aviso} tipo={searchParams.erro ? "erro" : "ok"} />
      <Link href="/equipas" className="text-sm text-quadra-600 underline">Voltar para equipas</Link>

      <header className="flex items-center gap-4">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-quadra-900 font-titulo text-3xl font-bold text-white">
          {atleta.nome.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase()}
        </span>
        <div>
          <h1 className="font-titulo text-3xl font-bold">{atleta.nome}</h1>
          <p className="text-suave">{atleta.posicao ?? "Posição não informada"}{idade ? ` · ${idade} anos` : ""}</p>
        </div>
        <div className="ml-auto"><BotaoImprimir /></div>
      </header>

      {comissaoConvida && (
        <section className="rounded-lg border border-linha bg-white p-5 print:hidden">
          <details>
            <summary className="cursor-pointer font-titulo text-xl font-semibold">Editar dados do atleta</summary>
            <form action={atualizarAtleta.bind(null, atleta.id)} className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium sm:col-span-2">Nome completo
                <input name="nome" required defaultValue={atleta.nome} className="mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5" />
              </label>
              <label className="block text-sm font-medium">Posição
                <select name="posicao" defaultValue={atleta.posicao ?? ""} className="mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5">
                  <option value="">Não informar</option>
                  {[...POSICOES, ...(atleta.posicao && !POSICOES.includes(atleta.posicao) ? [atleta.posicao] : [])].map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">Ano de nascimento
                <input name="ano" type="number" min={1950} max={2020} defaultValue={atleta.ano_nascimento ?? ""} className="mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5" />
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input name="ativo" type="checkbox" defaultChecked={atleta.ativo !== false} /> Atleta ativo (desmarque para tirá-lo das listas de monitorização sem apagar o histórico)
              </label>
              <div className="sm:col-span-2"><button className="rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90">Salvar alterações</button></div>
            </form>
            {perfil.papel === "gestor" && (
              <details className="mt-5 text-sm">
                <summary className="cursor-pointer text-suave underline">Excluir atleta</summary>
                <form action={excluirAtleta.bind(null, atleta.id)} className="mt-2 max-w-md rounded-md bg-bola-100 p-3">
                  <p>Isto apaga {atleta.nome} e todo o histórico dele: presenças, carga, bem-estar, testes e musculação. Essa ação não pode ser desfeita.</p>
                  <button className="mt-2 rounded-md bg-tinta px-3 py-1.5 text-white">Confirmar exclusão do atleta</button>
                </form>
              </details>
            )}
          </details>
        </section>
      )}

      {comissaoConvida && (
        <section className="rounded-lg border border-linha bg-white p-5 print:hidden">
          <h2 className="mb-3 font-titulo text-xl font-semibold">Acesso ao aplicativo</h2>
          {atleta.auth_id ? (
            <p className="text-sm text-suave">Este atleta já criou a conta e acessa o aplicativo.</p>
          ) : (
            <div className="space-y-3 text-sm">
              {convite ? (
                <>
                  <p>Código de acesso: <strong className="font-mono text-lg tracking-widest">{convite.codigo}</strong></p>
                  <p className="text-suave">Envie o código ao atleta. Na tela de entrada ele escolhe “primeiro acesso”, informa o código, o e-mail e uma senha. O código vale para uma conta só.</p>
                </>
              ) : (
                <p className="text-suave">O atleta ainda não tem acesso. Gere um código para ele criar a conta.</p>
              )}
              <form action={gerarConvite.bind(null, atleta.id)}>
                <button className="rounded-md border border-linha px-4 py-2 hover:bg-fundo">{convite ? "Gerar novo código" : "Gerar código de acesso"}</button>
              </form>
            </div>
          )}
        </section>
      )}

      <section className="rounded-lg border border-linha bg-white p-5">
        <h2 className="mb-3 font-titulo text-xl font-semibold">Equipas</h2>
        <ul className="divide-y divide-linha">
          {vinculos.map((v) => (
            <li key={v.equipas.id} className="flex items-center justify-between py-3">
              <Link href={`/equipas/${v.equipas.id}`} className="font-medium text-quadra-600 underline">{v.equipas.nome}</Link>
              <span className="text-sm text-suave">Camisa {v.numero_camisa ?? "-"}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-linha bg-white p-5">
        <h2 className="mb-3 font-titulo text-xl font-semibold">Carga das últimas sessões</h2>
        {(cargas ?? []).length === 0 ? <p className="text-sm text-suave">Nenhuma carga registrada.</p> : (
          <ul className="divide-y divide-linha">
            {(cargas as any[]).map((c, i) => {
              const s = Array.isArray(c.sessoes) ? c.sessoes[0] : c.sessoes;
              return <li key={i} className="flex items-center justify-between py-2.5 text-sm"><span>{s?.titulo}</span><span className="text-suave">RPE {c.rpe} × {c.minutos} min = <strong className="text-tinta">{c.carga_ua} UA</strong></span></li>;
            })}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-linha bg-white p-5">
        <h2 className="mb-3 font-titulo text-xl font-semibold">Bem-estar recente</h2>
        {(bemEstar ?? []).length === 0 ? <p className="text-sm text-suave">Nenhuma resposta registrada.</p> : (
          <ul className="divide-y divide-linha">
            {(bemEstar as any[]).map((b) => {
              const m = mediaRespostas(b.respostas ?? {});
              return (
                <li key={b.id} className="py-2.5 text-sm">
                  <div className="flex items-center justify-between"><span>{dataCurta(b.dia)}</span><span>{m === null ? "-" : `${fmt1(m)} / 5`}</span></div>
                  {editarBemEstar && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-suave underline">Editar ou excluir</summary>
                      <form action={atualizarBemEstar.bind(null, atleta.id, b.id)} className="mt-2 grid gap-3 rounded-md bg-fundo p-3 sm:grid-cols-2">
                        {perguntas.map((p) => (
                          <label key={p.chave} className="block font-medium">{p.pergunta}
                            <select name={`r_${p.chave}`} defaultValue={b.respostas?.[p.chave] ?? ""} required className="mt-1 w-full rounded-md border border-linha bg-white px-2 py-1.5">
                              <option value="" disabled>Escolha</option>
                              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </label>
                        ))}
                        <div className="flex items-center gap-4 sm:col-span-2">
                          <button className="rounded-md bg-bola-500 px-4 py-2 font-semibold text-white hover:opacity-90">Salvar alterações</button>
                          <button formAction={excluirBemEstar.bind(null, atleta.id, b.id)} formNoValidate className="text-suave underline">Excluir este registro</button>
                        </div>
                      </form>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-linha bg-white p-5">
        <h2 className="mb-3 font-titulo text-xl font-semibold">Últimos testes físicos</h2>
        {(marcas ?? []).length === 0 ? <p className="text-sm text-suave">Nenhum resultado registrado.</p> : (
          <ul className="divide-y divide-linha">
            {(marcas as any[]).map((m, i) => {
              const d = Array.isArray(m.definicoes_teste) ? m.definicoes_teste[0] : m.definicoes_teste;
              return (
                <li key={m.id} className="py-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span>{d?.nome}</span>
                    <span>{String(m.valor).replace(".", ",")} {d?.unidade} <span className="text-suave">({m.medido_em.split("-").reverse().join("/")})</span></span>
                  </div>
                  {editarTestes && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-suave underline">Editar ou excluir</summary>
                      <form action={atualizarResultadoTeste.bind(null, atleta.id, m.id)} className="mt-2 grid gap-3 rounded-md bg-fundo p-3 sm:grid-cols-2">
                        <label className="block font-medium">Resultado ({d?.unidade})
                          <input name="valor" required inputMode="decimal" defaultValue={String(m.valor).replace(".", ",")} className="mt-1 w-full rounded-md border border-linha bg-white px-2 py-1.5" />
                        </label>
                        <label className="block font-medium">Data
                          <input name="data" type="date" required defaultValue={m.medido_em} max={hojeChave()} className="mt-1 w-full rounded-md border border-linha bg-white px-2 py-1.5" />
                        </label>
                        <div className="flex items-center gap-4 sm:col-span-2">
                          <button className="rounded-md bg-bola-500 px-4 py-2 font-semibold text-white hover:opacity-90">Salvar alterações</button>
                          <button formAction={excluirResultadoTeste.bind(null, atleta.id, m.id)} formNoValidate className="text-suave underline">Excluir este resultado</button>
                        </div>
                      </form>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
