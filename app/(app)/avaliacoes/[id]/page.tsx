import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar, podeVer } from "@/lib/permissions";
import { hojeChave } from "@/lib/periodo";
import { CartaoIndicador } from "@/components/dashboard/CartaoIndicador";
import { GraficoBarras, GraficoEvolucao } from "@/components/avaliacoes/graficos";
import { Aviso } from "@/components/ui/Aviso";
import { registrarResultado, excluirResultado, excluirTeste } from "../actions";

const campo = "mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5";
const br = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");
const dataBr = (d: string) => d.split("-").reverse().join("/");
const media = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

export default async function DetalheTeste({ params, searchParams }: { params: { id: string }; searchParams: { erro?: string; aviso?: string } }) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeVer(perfil.papel, "avaliacoes")) redirect("/dashboard");
  const editar = podeEditar(perfil.papel, "avaliacoes");

  const { data: teste } = await supabase.from("definicoes_teste").select("id, nome, categoria, unidade, menor_e_melhor").eq("id", params.id).single();
  if (!teste) notFound();

  const [{ data: resultados }, { data: atletas }] = await Promise.all([
    supabase.from("resultados_teste").select("id, valor, medido_em, atleta_id, usuarios:usuarios!atleta_id(nome)").eq("definicao_id", teste.id).order("medido_em", { ascending: false }).limit(500),
    supabase.from("usuarios").select("id, nome").eq("papel", "atleta").eq("ativo", true).order("nome"),
  ]);

  // ---- Dashboard do grupo ----
  const todos = ((resultados ?? []) as any[]).map((r) => ({ id: r.id as string, atletaId: r.atleta_id as string, nome: (r.usuarios?.nome ?? "-") as string, valor: Number(r.valor), data: r.medido_em as string }));
  const melhorQue = (a: number, b: number) => (teste.menor_e_melhor ? a < b : a > b);

  const porAtleta = new Map<string, typeof todos>();
  for (const r of [...todos].sort((a, b) => a.data.localeCompare(b.data))) porAtleta.set(r.atletaId, [...(porAtleta.get(r.atletaId) ?? []), r]);

  const linhas = [...porAtleta.values()].map((lista) => {
    const ultimo = lista[lista.length - 1];
    const anterior = lista.length > 1 ? lista[lista.length - 2] : null;
    const melhor = lista.reduce((m, r) => (melhorQue(r.valor, m.valor) ? r : m));
    const variacao = anterior && anterior.valor !== 0 ? ((ultimo.valor - anterior.valor) / Math.abs(anterior.valor)) * 100 : null;
    const melhoria = variacao === null ? null : teste.menor_e_melhor ? -variacao : variacao; // positivo = melhorou
    return { nome: ultimo.nome, ultimo, melhor, melhoria };
  }).sort((a, b) => (teste.menor_e_melhor ? a.ultimo.valor - b.ultimo.valor : b.ultimo.valor - a.ultimo.valor));

  const mediaGrupo = linhas.length ? media(linhas.map((l) => l.ultimo.valor)) : null;
  const melhorias = linhas.map((l) => l.melhoria).filter((m): m is number => m !== null);
  const evolucaoMedia = melhorias.length ? media(melhorias) : null;

  const porData = new Map<string, number[]>();
  todos.forEach((r) => porData.set(r.data, [...(porData.get(r.data) ?? []), r.valor]));
  const pontos = [...porData.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([data, v]) => ({ data, valor: media(v), n: v.length }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Aviso key={Date.now()} mensagem={searchParams.erro ?? searchParams.aviso} tipo={searchParams.erro ? "erro" : "ok"} />
      <Link href="/avaliacoes" className="text-sm text-quadra-600 underline">Voltar para avaliações</Link>
      <header>
        <h1 className="font-titulo text-3xl font-bold">{teste.nome}</h1>
        <p className="text-suave">{teste.categoria ?? "Outro"} · {teste.unidade}{teste.menor_e_melhor ? " · menor é melhor" : ""}</p>
      </header>

      {editar && (
        (atletas ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed border-linha bg-white p-5 text-suave">Cadastre atletas em <Link href="/equipas" className="text-quadra-600 underline">Equipas</Link> para registrar resultados.</p>
        ) : (
          <form action={registrarResultado.bind(null, teste.id)} className="grid gap-4 rounded-lg border border-linha bg-white p-5 sm:grid-cols-4">
            <label className="block text-sm font-medium sm:col-span-2">Atleta
              <select name="atleta" required className={campo}>{(atletas ?? []).map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}</select>
            </label>
            <label className="block text-sm font-medium">Resultado ({teste.unidade})
              <input name="valor" required inputMode="decimal" className={campo} />
            </label>
            <label className="block text-sm font-medium">Data
              <input name="data" type="date" required defaultValue={hojeChave()} max={hojeChave()} className={campo} />
            </label>
            <div className="sm:col-span-4"><button className="rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90">Registrar resultado</button></div>
          </form>
        )
      )}

      {linhas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-linha bg-white p-6 text-suave">Nenhum resultado registrado ainda. O painel do grupo aparece assim que houver o primeiro.</p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Indicadores do grupo">
            <CartaoIndicador rotulo="Atletas avaliados" valor={`${linhas.length}`} detalhe={`de ${(atletas ?? []).length} atletas ativos`} />
            <CartaoIndicador rotulo="Média do grupo" valor={`${br(mediaGrupo!)}`} detalhe={`${teste.unidade}, último resultado de cada atleta`} />
            <CartaoIndicador rotulo="Melhor resultado atual" valor={br(linhas[0].ultimo.valor)} detalhe={`${teste.unidade} · ${linhas[0].nome}`} />
            <CartaoIndicador rotulo="Evolução média" destaque={evolucaoMedia !== null && evolucaoMedia < 0}
              valor={evolucaoMedia === null ? "-" : `${evolucaoMedia > 0 ? "+" : ""}${br(evolucaoMedia)}%`}
              detalhe={evolucaoMedia === null ? "Precisa de 2 medições por atleta" : evolucaoMedia >= 0 ? "Melhora desde a medição anterior" : "Piora desde a medição anterior"} />
          </section>

          <section className="rounded-lg border border-linha bg-white p-5">
            <h2 className="mb-3 font-titulo text-xl font-semibold">Último resultado por atleta</h2>
            <GraficoBarras dados={linhas.map((l) => ({ nome: l.nome, valor: l.ultimo.valor }))} media={mediaGrupo!} unidade={teste.unidade} />
          </section>

          <section className="rounded-lg border border-linha bg-white p-5">
            <h2 className="mb-1 font-titulo text-xl font-semibold">Evolução do grupo</h2>
            <p className="mb-3 text-sm text-suave">Média dos atletas avaliados em cada data.</p>
            {pontos.length < 2 ? <p className="text-sm text-suave">Registre resultados em pelo menos duas datas para ver a evolução.</p> : <GraficoEvolucao pontos={pontos} unidade={teste.unidade} />}
          </section>

          <section className="overflow-x-auto rounded-lg border border-linha bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-linha text-suave">
                <tr>
                  <th className="px-4 py-3 font-medium">Atleta</th>
                  <th className="px-4 py-3 font-medium">Último</th>
                  <th className="px-4 py-3 font-medium">Variação</th>
                  <th className="px-4 py-3 font-medium">Melhor marca</th>
                  <th className="px-4 py-3 font-medium">Contra a média</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linha">
                {linhas.map((l, i) => {
                  const dif = l.ultimo.valor - mediaGrupo!;
                  const melhorQueMedia = teste.menor_e_melhor ? dif < 0 : dif > 0;
                  return (
                    <tr key={i}>
                      <td className="px-4 py-3 font-medium">{l.nome}</td>
                      <td className="px-4 py-3">{br(l.ultimo.valor)} {teste.unidade} <span className="text-suave">({dataBr(l.ultimo.data)})</span></td>
                      <td className="px-4 py-3">{l.melhoria === null ? "-" : `${l.melhoria > 0 ? "+" : ""}${br(l.melhoria)}% (${l.melhoria > 0 ? "melhora" : l.melhoria < 0 ? "piora" : "igual"})`}</td>
                      <td className="px-4 py-3">{br(l.melhor.valor)} {teste.unidade}</td>
                      <td className="px-4 py-3">{dif === 0 ? "Na média" : `${br(Math.abs(dif))} ${teste.unidade} ${melhorQueMedia ? "melhor" : "pior"}`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      )}

      {todos.length > 0 && (
        <section className="overflow-x-auto rounded-lg border border-linha bg-white">
          <h2 className="px-4 pt-4 font-titulo text-xl font-semibold">Histórico de registros</h2>
          <table className="mt-2 w-full text-left text-sm">
            <thead className="border-b border-linha text-suave"><tr><th className="px-4 py-3 font-medium">Data</th><th className="px-4 py-3 font-medium">Atleta</th><th className="px-4 py-3 font-medium">Resultado</th><th /></tr></thead>
            <tbody className="divide-y divide-linha">
              {todos.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">{dataBr(r.data)}</td>
                  <td className="px-4 py-3">{r.nome}</td>
                  <td className="px-4 py-3">{br(r.valor)} {teste.unidade}</td>
                  <td className="px-4 py-3 text-right">{editar && <form action={excluirResultado.bind(null, teste.id, r.id)}><button className="text-suave underline">Excluir</button></form>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {editar && (
        <details className="text-sm">
          <summary className="cursor-pointer text-suave underline">Excluir este teste</summary>
          <form action={excluirTeste.bind(null, teste.id)} className="mt-2 max-w-md rounded-md bg-bola-100 p-3">
            <p>{todos.length > 0 ? `Os ${todos.length} resultado${todos.length > 1 ? "s" : ""} registrado${todos.length > 1 ? "s" : ""} neste teste também serão apagados.` : "Este teste ainda não tem resultados."} Essa ação não pode ser desfeita.</p>
            <button className="mt-2 rounded-md bg-tinta px-3 py-1.5 text-white">Confirmar exclusão</button>
          </form>
        </details>
      )}
    </div>
  );
}
