import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeVer } from "@/lib/permissions";
import { chaveDia } from "@/lib/datas";
import { hojeChave, somarDias, inicioDoDia, inicioDaSemana, dataCurta } from "@/lib/periodo";
import { fmt1 } from "@/lib/monitorizacao";
import { ROTULO_TIPO } from "@/components/calendario/tipos";
import { CartaoIndicador } from "@/components/dashboard/CartaoIndicador";
import { GraficoColunas } from "@/components/estatisticas/GraficoColunas";
import { BotaoImprimir } from "@/components/ui/BotaoImprimir";

const PERIODOS = [7, 30, 90];
const EXPORTACOES = [
  { tipo: "carga", titulo: "Carga das sessões", desc: "Uma linha por atleta em cada sessão, com RPE, minutos e carga." },
  { tipo: "bem-estar", titulo: "Bem-estar", desc: "As respostas diárias de cada atleta e a média." },
  { tipo: "presencas", titulo: "Presenças", desc: "A chamada de cada sessão." },
  { tipo: "testes", titulo: "Testes físicos", desc: "Todos os resultados, de todas as datas." },
  { tipo: "musculacao", titulo: "Musculação", desc: "Os retornos das sessões registrados pelos atletas." },
];
const media = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const um = (o: any) => (Array.isArray(o) ? o[0] : o);

export default async function Estatisticas({ searchParams }: { searchParams: { equipa?: string; dias?: string } }) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeVer(perfil.papel, "estatisticas")) redirect("/dashboard");

  const dias = PERIODOS.includes(Number(searchParams.dias)) ? Number(searchParams.dias) : 30;
  const equipaId = searchParams.equipa ?? "";
  const hoje = hojeChave();
  const desde = somarDias(hoje, -(dias - 1));
  const inicio = inicioDoDia(desde);
  const agora = new Date().toISOString();

  const { data: equipas } = await supabase.from("equipas").select("id, nome").order("nome");

  let qSessoes = supabase.from("sessoes").select("id, tipo, inicio, duracao_min").gte("inicio", inicio).lte("inicio", agora);
  let qPresencas = supabase.from("presencas").select("status, atleta_id, usuarios(nome), sessoes!inner(inicio, equipa_id)").gte("sessoes.inicio", inicio).lte("sessoes.inicio", agora);
  let qCarga = supabase.from("rpe_sessao").select("rpe, carga_ua, sessoes!inner(inicio, equipa_id, tipo)").gte("sessoes.inicio", inicio).lte("sessoes.inicio", agora);
  if (equipaId) {
    qSessoes = qSessoes.eq("equipa_id", equipaId);
    qPresencas = qPresencas.eq("sessoes.equipa_id", equipaId);
    qCarga = qCarga.eq("sessoes.equipa_id", equipaId);
  }
  const [{ data: sessoes }, { data: presencas }, { data: cargas }] = await Promise.all([qSessoes, qPresencas, qCarga]);

  // ---- Treinos ----
  const lista = (sessoes ?? []) as any[];
  const registrosCarga = (cargas ?? []) as any[];
  const horas = lista.reduce((s, x) => s + x.duracao_min, 0) / 60;
  const rpeMedio = media(registrosCarga.map((r) => r.rpe));
  const cargaMedia = media(registrosCarga.map((r) => r.carga_ua));

  const porTipo = Object.keys(ROTULO_TIPO).map((tipo) => {
    const sess = lista.filter((x) => x.tipo === tipo);
    const reg = registrosCarga.filter((r) => um(r.sessoes)?.tipo === tipo);
    return { tipo, sessoes: sess.length, horas: sess.reduce((s, x) => s + x.duracao_min, 0) / 60, rpe: media(reg.map((r) => r.rpe)), carga: media(reg.map((r) => r.carga_ua)) };
  }).filter((l) => l.sessoes > 0);

  const porSemana = new Map<string, number>();
  for (let s = inicioDaSemana(desde); s <= hoje; s = somarDias(s, 7)) porSemana.set(s, 0);
  lista.forEach((x) => { const s = inicioDaSemana(chaveDia(x.inicio)); porSemana.set(s, (porSemana.get(s) ?? 0) + 1); });
  const semanas = [...porSemana.entries()].map(([s, n]) => ({ rotulo: dataCurta(s), valor: n }));

  // ---- Presença ----
  type Linha = { nome: string; presente: number; doenca: number; lesao: number; outro: number; total: number };
  const atletas = new Map<string, Linha>();
  for (const p of (presencas ?? []) as any[]) {
    const l = atletas.get(p.atleta_id) ?? { nome: um(p.usuarios)?.nome ?? "-", presente: 0, doenca: 0, lesao: 0, outro: 0, total: 0 };
    l.total += 1;
    if (p.status === "presente") l.presente += 1;
    else if (p.status === "falta_doenca") l.doenca += 1;
    else if (p.status === "falta_lesao") l.lesao += 1;
    else l.outro += 1;
    atletas.set(p.atleta_id, l);
  }
  const linhas = [...atletas.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  const totalReg = linhas.reduce((s, l) => s + l.total, 0);
  const totalPres = linhas.reduce((s, l) => s + l.presente, 0);
  const faltas = (k: "doenca" | "lesao" | "outro") => linhas.reduce((s, l) => s + l[k], 0);
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "-");

  const nomeEquipa = equipaId ? (equipas ?? []).find((e) => e.id === equipaId)?.nome : "Todas as equipas";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-titulo text-3xl font-bold">Estatísticas</h1>
          <p className="text-suave">{nomeEquipa} · últimos {dias} dias ({dataCurta(desde)} a {dataCurta(hoje)})</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <form action="/estatisticas" className="flex gap-2">
            <select name="equipa" defaultValue={equipaId} aria-label="Equipa" className="rounded-md border border-linha bg-white px-3 py-2 text-sm">
              <option value="">Todas as equipas</option>
              {(equipas ?? []).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            <select name="dias" defaultValue={dias} aria-label="Período" className="rounded-md border border-linha bg-white px-3 py-2 text-sm">
              {PERIODOS.map((d) => <option key={d} value={d}>Últimos {d} dias</option>)}
            </select>
            <button className="rounded-md border border-linha bg-white px-3 py-2 text-sm">Aplicar</button>
          </form>
          <BotaoImprimir />
        </div>
      </div>

      <section aria-label="Treinos" className="space-y-4">
        <h2 className="font-titulo text-2xl font-semibold">Treinos</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <CartaoIndicador rotulo="Sessões realizadas" valor={String(lista.length)} detalhe={`${lista.filter((x) => x.tipo === "jogo").length} jogo(s)`} />
          <CartaoIndicador rotulo="Horas de sessão" valor={fmt1(horas)} />
          <CartaoIndicador rotulo="RPE médio" valor={rpeMedio === null ? "-" : fmt1(rpeMedio)} detalhe={`${registrosCarga.length} registro(s) de carga`} />
          <CartaoIndicador rotulo="Carga média por atleta" valor={cargaMedia === null ? "-" : String(Math.round(cargaMedia))} detalhe="UA por sessão" />
        </div>

        {lista.length === 0 ? <p className="rounded-lg border border-dashed border-linha bg-white p-6 text-suave">Nenhuma sessão realizada neste período.</p> : (
          <>
            <div className="rounded-lg border border-linha bg-white p-5">
              <h3 className="mb-2 font-titulo text-xl font-semibold">Sessões por semana</h3>
              <GraficoColunas dados={semanas} descricao="Número de sessões em cada semana do período, indicadas pela data da segunda-feira" />
              <p className="text-xs text-suave">Cada coluna é uma semana, identificada pela segunda-feira.</p>
            </div>
            <div className="overflow-x-auto rounded-lg border border-linha bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-linha text-suave"><tr><th className="px-4 py-3 font-medium">Tipo de sessão</th><th className="px-4 py-3 font-medium">Sessões</th><th className="px-4 py-3 font-medium">Horas</th><th className="px-4 py-3 font-medium">RPE médio</th><th className="px-4 py-3 font-medium">Carga média (UA)</th></tr></thead>
                <tbody className="divide-y divide-linha">
                  {porTipo.map((l) => (
                    <tr key={l.tipo}>
                      <td className="px-4 py-3 font-medium">{ROTULO_TIPO[l.tipo]}</td>
                      <td className="px-4 py-3">{l.sessoes}</td>
                      <td className="px-4 py-3">{fmt1(l.horas)}</td>
                      <td className="px-4 py-3">{l.rpe === null ? "-" : fmt1(l.rpe)}</td>
                      <td className="px-4 py-3">{l.carga === null ? "-" : Math.round(l.carga)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section aria-label="Presença" className="space-y-4">
        <h2 className="font-titulo text-2xl font-semibold">Presença</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <CartaoIndicador rotulo="Presença média" valor={pct(totalPres, totalReg)} detalhe={`${totalReg} registro(s)`} />
          <CartaoIndicador rotulo="Faltas por doença" valor={String(faltas("doenca"))} />
          <CartaoIndicador rotulo="Faltas por lesão" valor={String(faltas("lesao"))} destaque={faltas("lesao") > 0} />
          <CartaoIndicador rotulo="Faltas por outro motivo" valor={String(faltas("outro"))} />
        </div>
        <div className="overflow-x-auto rounded-lg border border-linha bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-linha text-suave"><tr><th className="px-4 py-3 font-medium">Atleta</th><th className="px-4 py-3 font-medium">Presença</th><th className="px-4 py-3 font-medium">Presentes</th><th className="px-4 py-3 font-medium">Doença</th><th className="px-4 py-3 font-medium">Lesão</th><th className="px-4 py-3 font-medium">Outro</th></tr></thead>
            <tbody className="divide-y divide-linha">
              {linhas.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-suave">Nenhuma presença registrada neste período.</td></tr>}
              {linhas.map((l, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 font-medium">{l.nome}</td>
                  <td className="px-4 py-3">{pct(l.presente, l.total)} <span className="text-suave">({l.presente}/{l.total})</span></td>
                  <td className="px-4 py-3">{l.presente}</td>
                  <td className="px-4 py-3">{l.doenca}</td>
                  <td className="px-4 py-3">{l.lesao}</td>
                  <td className="px-4 py-3">{l.outro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-suave">A presença considera só as sessões em que a chamada foi registrada no calendário.</p>
      </section>

      <section aria-label="Exportar dados" className="space-y-3 print:hidden">
        <h2 className="font-titulo text-2xl font-semibold">Exportar dados (CSV)</h2>
        <p className="text-sm text-suave">Planilhas para abrir no Excel, com os últimos {dias} dias de cada assunto (os testes físicos saem completos). Os arquivos têm nomes de atletas, então guarde-os com cuidado.</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {EXPORTACOES.map((e) => (
            <li key={e.tipo}>
              <a href={`/exportar/${e.tipo}?dias=${dias === 7 ? 30 : dias}`} download className="block rounded-lg border border-linha bg-white p-4 hover:border-quadra-600">
                <p className="font-medium">{e.titulo}</p>
                <p className="text-sm text-suave">{e.desc}</p>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
