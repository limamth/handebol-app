import Link from "next/link";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeVer } from "@/lib/permissions";
import { carregarDores, ROTULO_NOTA_DORES } from "@/lib/monitorizacao";
import { dataCurta, hojeChave, somarDias } from "@/lib/periodo";
import { ROTULO_DOR } from "@/lib/forca";
import { CartaoIndicador } from "@/components/dashboard/CartaoIndicador";
import { BotaoImprimir } from "@/components/ui/BotaoImprimir";

const PERIODOS = [7, 14, 30];

export default async function Dores({ searchParams }: { searchParams: { equipa?: string; dias?: string } }) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeVer(perfil.papel, "dores")) redirect("/dashboard");

  const dias = PERIODOS.includes(Number(searchParams.dias)) ? Number(searchParams.dias) : 7;
  const equipaId = searchParams.equipa || undefined;
  const hoje = hojeChave();
  const { data: equipas } = await supabase.from("equipas").select("id, nome").order("nome");
  const linhas = await carregarDores(supabase, equipaId, hoje, dias);

  const atencao = linhas.filter((l) => l.gravidade >= 2);
  const semDor = linhas.filter((l) => l.gravidade < 2);
  const fortes = linhas.filter((l) => l.gravidade >= 3).length;
  const moderadas = linhas.filter((l) => l.gravidade === 2).length;
  const semInfo = linhas.filter((l) => l.ultima === null && l.forca === null).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-titulo text-3xl font-bold">Dores</h1>
          <p className="text-suave">Acompanhamento para a fisioterapia · {dataCurta(somarDias(hoje, -(dias - 1)))} a {dataCurta(hoje)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <form action="/dores" className="flex gap-2">
            <select name="equipa" defaultValue={equipaId ?? ""} aria-label="Equipa" className="rounded-md border border-linha bg-white px-3 py-2 text-sm">
              <option value="">Todas as equipas</option>
              {(equipas ?? []).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            <select name="dias" defaultValue={dias} aria-label="Período" className="rounded-md border border-linha bg-white px-3 py-2 text-sm">
              {PERIODOS.map((d) => <option key={d} value={d}>Últimos {d} dias</option>)}
            </select>
            <button className="rounded-md border border-linha bg-white px-3 py-2 text-sm hover:bg-fundo">Aplicar</button>
          </form>
          <BotaoImprimir />
        </div>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Resumo">
        <CartaoIndicador rotulo="Dor forte" valor={String(fortes)} destaque={fortes > 0} detalhe="nota 2 ou menos, ou dor forte na musculação" />
        <CartaoIndicador rotulo="Dor moderada" valor={String(moderadas)} detalhe="nota 3, ou dor moderada na musculação" />
        <CartaoIndicador rotulo="Sem dor relevante" valor={String(semDor.length)} />
        <CartaoIndicador rotulo="Sem informação" valor={String(semInfo)} detalhe="não responderam no período" />
      </section>

      <section aria-label="Atletas com dor" className="space-y-3">
        <h2 className="font-titulo text-2xl font-semibold">Atletas que precisam de atenção</h2>
        {atencao.length === 0 ? (
          <p className="rounded-lg border border-dashed border-linha bg-white p-5 text-suave">Nenhum atleta com dor relevante neste período.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-linha bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-linha text-suave">
                <tr>
                  <th className="px-4 py-3 font-medium">Atleta</th>
                  <th className="px-4 py-3 font-medium">Última nota de dores</th>
                  <th className="px-4 py-3 font-medium">Pior nota no período</th>
                  <th className="px-4 py-3 font-medium">Evolução das notas</th>
                  <th className="px-4 py-3 font-medium">Dor na musculação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linha align-top">
                {atencao.map((l) => (
                  <tr key={l.id} className={l.gravidade >= 3 ? "bg-bola-100" : ""}>
                    <td className="px-4 py-3 font-medium"><Link href={`/atletas/${l.id}`} className="text-quadra-600 underline">{l.nome}</Link></td>
                    <td className="px-4 py-3">{l.ultima ? `${l.ultima.nota} · ${ROTULO_NOTA_DORES[l.ultima.nota]} (${dataCurta(l.ultima.dia)})` : "-"}</td>
                    <td className="px-4 py-3">{l.pior === null ? "-" : `${l.pior} · ${ROTULO_NOTA_DORES[l.pior]}`}</td>
                    <td className="px-4 py-3">{l.notas.length ? l.notas.map((n) => `${dataCurta(n.dia)}: ${n.nota}`).join(" · ") : "-"}</td>
                    <td className="px-4 py-3">{l.forca ? `${ROTULO_DOR[l.forca.nivel]}${l.forca.local ? ` · ${l.forca.local}` : ""} (${dataCurta(l.forca.dia)})` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {semDor.length > 0 && (
        <details className="rounded-lg border border-linha bg-white p-4 text-sm">
          <summary className="cursor-pointer font-medium">Sem dor relevante no período ({semDor.length})</summary>
          <ul className="mt-3 grid gap-1 sm:grid-cols-2">
            {semDor.map((l) => (
              <li key={l.id}>
                <Link href={`/atletas/${l.id}`} className="text-quadra-600 underline">{l.nome}</Link>
                <span className="ml-2 text-suave">{l.ultima ? `última nota ${l.ultima.nota} (${dataCurta(l.ultima.dia)})` : "sem resposta no período"}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="max-w-3xl text-sm text-suave">
        A nota de dores vem do questionário de bem-estar: 1 = dor muito forte, 2 = forte, 3 = moderada, 4 = leve e 5 = sem dor.
        A coluna de musculação traz as dores moderadas ou fortes que o atleta informou nos treinos, com o local. Os atletas não veem esta tela.
      </p>
    </div>
  );
}
