import Link from "next/link";
import { obterPerfil } from "@/lib/sessao";
import { buscarBatidas, carregarAtletas, carregarFases, dataBr, fmtPct, resumir } from "@/lib/shootout";

export default async function CompararFases() {
  const { supabase } = await obterPerfil();
  const [fases, atletas, todas] = await Promise.all([carregarFases(supabase), carregarAtletas(supabase), buscarBatidas(supabase, { fase: "todas" })]);

  // da fase mais antiga para a mais recente (a mais recente fica à direita)
  const colunas: { id: string; nome: string; periodo: string }[] = [...fases].sort((a, b) => a.inicio.localeCompare(b.inicio))
    .map((f) => ({ id: f.id, nome: f.nome, periodo: `${dataBr(f.inicio)} a ${dataBr(f.fim)}` }));
  if (todas.some((b) => b.faseId === null)) colunas.push({ id: "sem", nome: "Sem fase", periodo: "" });
  const daColuna = (id: string) => todas.filter((b) => (id === "sem" ? b.faseId === null : b.faseId === id));

  const resumos = colunas.map((c) => { const b = daColuna(c.id); return { ...c, ...resumir(b), sessoes: new Set(b.map((x) => x.sessaoId)).size }; });

  const ids = new Set<string>();
  todas.forEach((b) => { if (b.batedorId) ids.add(b.batedorId); });
  const matriz = [...ids].map((id) => {
    const celulas = colunas.map((c) => resumir(daColuna(c.id).filter((b) => b.batedorId === id)));
    const comDados = celulas.filter((x) => x.total > 0);
    const variacao = comDados.length >= 2 && comDados[comDados.length - 1].pct !== null && comDados[comDados.length - 2].pct !== null
      ? (comDados[comDados.length - 1].pct! - comDados[comDados.length - 2].pct!) * 100 : null;
    return { id, nome: atletas.get(id)?.nome ?? "Atleta removido", celulas, variacao };
  }).sort((a, b) => a.nome.localeCompare(b.nome));

  if (colunas.length === 0 || todas.length === 0) {
    return <p className="rounded-lg border border-dashed border-linha bg-white p-6 text-suave">Ainda não há batidas registradas. Quando houver, aqui aparece a comparação entre as fases de treinamento.</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-suave">Cada fase de treinamento tem o seu ranking. Aqui você compara o aproveitamento entre as fases. As sessões entram na fase pela data ou pela escolha feita na sessão.</p>

      <section aria-label="Resumo por fase" className="overflow-x-auto rounded-lg border border-linha bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-linha text-suave">
            <tr><th className="px-4 py-3 font-medium">Fase</th><th className="px-4 py-3 font-medium">Sessões</th><th className="px-4 py-3 font-medium">Batidas</th><th className="px-4 py-3 font-medium">Convertidas</th><th className="px-4 py-3 font-medium">Aproveitamento</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-linha">
            {resumos.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium">{r.nome}{r.periodo && <span className="block text-xs font-normal text-suave">{r.periodo}</span>}</td>
                <td className="px-4 py-3">{r.sessoes}</td><td className="px-4 py-3">{r.total}</td><td className="px-4 py-3">{r.convertidas}</td><td className="px-4 py-3">{fmtPct(r.pct)}</td>
                <td className="px-4 py-3"><Link href={`/shootout/ranking?fase=${r.id}`} className="text-quadra-600 underline">Ver ranking</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-label="Aproveitamento por atleta e fase" className="space-y-2">
        <h2 className="font-titulo text-2xl font-semibold">Aproveitamento por atleta</h2>
        <div className="overflow-x-auto rounded-lg border border-linha bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-linha text-suave">
              <tr>
                <th className="px-4 py-3 font-medium">Atleta</th>
                {colunas.map((c) => <th key={c.id} className="px-3 py-3 font-medium">{c.nome}</th>)}
                <th className="px-3 py-3 font-medium">Variação<span className="block text-xs font-normal">últimas duas fases</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {matriz.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 font-medium"><Link href={`/shootout?atleta=${m.id}&aba=evolucao&fase=todas`} className="text-quadra-600 underline">{m.nome}</Link></td>
                  {m.celulas.map((c, i) => <td key={i} className="px-3 py-3">{c.total ? <>{fmtPct(c.pct)} <span className="text-xs text-suave">({c.convertidas}/{c.total})</span></> : "-"}</td>)}
                  <td className="px-3 py-3">{m.variacao === null ? "-" : `${m.variacao > 0 ? "+" : ""}${m.variacao.toFixed(1).replace(".", ",")} p.p.`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-suave">p.p. = pontos percentuais. A variação compara as duas fases mais recentes em que o atleta bateu.</p>
      </section>
    </div>
  );
}
