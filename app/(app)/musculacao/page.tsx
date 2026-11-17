import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeVer } from "@/lib/permissions";
import { NOMES_MES, mesVizinho } from "@/lib/datas";
import { hojeChave, somarDias, dataCurta } from "@/lib/periodo";
import { fmt1 } from "@/lib/monitorizacao";
import { GRAVIDADE_DOR, ROTULO_CARGA, ROTULO_DISPOSICAO, ROTULO_DOR, ROTULO_EXECUCAO } from "@/lib/forca";
import { ROTULO_RPE } from "@/components/monitorizacao/escalas";
import { CalendarioForca } from "@/components/musculacao/CalendarioForca";
import { CartaoIndicador } from "@/components/dashboard/CartaoIndicador";
import { Aviso } from "@/components/ui/Aviso";
import { salvarForca, excluirForca } from "./actions";

const campo = "mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5";
const dataBr = (d: string) => d.split("-").reverse().join("/");
const media = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
type Busca = { atleta?: string; mes?: string; dia?: string; aviso?: string; erro?: string };

export default async function Musculacao({ searchParams }: { searchParams: Busca }) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeVer(perfil.papel, "musculacao")) redirect("/dashboard");

  const ehAtleta = perfil.papel === "atleta";
  const atletaId = ehAtleta ? perfil.id : searchParams.atleta;
  const hoje = hojeChave();
  const aviso = <Aviso key={Date.now()} mensagem={searchParams.erro ?? searchParams.aviso} tipo={searchParams.erro ? "erro" : "ok"} />;

  if (!atletaId) return <VisaoGeral supabase={supabase} hoje={hoje} aviso={aviso} />;

  const { data: atleta } = await supabase.from("usuarios").select("id, nome").eq("id", atletaId).eq("papel", "atleta").single();
  if (!atleta) notFound();

  const dia = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.dia ?? "") && searchParams.dia! <= hoje ? searchParams.dia! : hoje;
  const mesTexto = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : dia.slice(0, 7);
  const [ano, mes] = mesTexto.split("-").map(Number);
  const proximoMes = mesVizinho(ano, mes, 1);

  const { data: doMes } = await supabase.from("sessoes_forca").select("*").eq("atleta_id", atletaId).gte("dia", `${mesTexto}-01`).lt("dia", `${proximoMes}-01`);
  const registros = (doMes ?? []) as any[];
  const porDia: Record<string, any> = {};
  registros.forEach((r) => { porDia[r.dia] = r; });

  let registroDia = porDia[dia];
  if (!registroDia && dia.slice(0, 7) !== mesTexto) {
    const { data } = await supabase.from("sessoes_forca").select("*").eq("atleta_id", atletaId).eq("dia", dia).maybeSingle();
    registroDia = data ?? undefined;
  }

  const podeRegistrar = ehAtleta || ["gestor", "comissao_tecnica"].includes(perfil.papel);
  const href = (m: string, d?: string) => `/musculacao?${ehAtleta ? "" : `atleta=${atletaId}&`}mes=${m}${d ? `&dia=${d}` : ""}`;
  const rpes = registros.filter((r) => r.rpe !== null).map((r) => r.rpe as number);
  const cargaMes = registros.reduce((s, r) => s + (r.carga_ua ?? 0), 0);
  const diasComDor = registros.filter((r) => GRAVIDADE_DOR.indexOf(r.dor) >= 2).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {aviso}
      {!ehAtleta && <Link href="/musculacao" className="text-sm text-quadra-600 underline">Voltar para o acompanhamento do grupo</Link>}
      <header>
        <h1 className="font-titulo text-3xl font-bold">{ehAtleta ? "Meus treinos de musculação" : `Musculação de ${atleta.nome}`}</h1>
        <p className="text-suave">{ehAtleta ? "Clique no dia em que você treinou e preencha o retorno da sessão." : "Calendário e retorno das sessões registradas pelo atleta."}</p>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Resumo do mês">
        <CartaoIndicador rotulo="Sessões no mês" valor={String(registros.length)} />
        <CartaoIndicador rotulo="RPE médio" valor={rpes.length ? fmt1(media(rpes)) : "-"} />
        {!ehAtleta && <CartaoIndicador rotulo="Carga do mês" valor={`${cargaMes}`} detalhe="UA (RPE × minutos)" />}
        <CartaoIndicador rotulo="Dias com dor moderada ou forte" valor={String(diasComDor)} destaque={diasComDor > 0} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-center gap-3">
            <Link href={href(mesVizinho(ano, mes, -1))} aria-label="Mês anterior" className="rounded-md border border-linha bg-white px-3 py-2">‹</Link>
            <h2 className="min-w-44 text-center font-titulo text-2xl font-bold">{NOMES_MES[mes - 1]} {ano}</h2>
            <Link href={href(mesVizinho(ano, mes, 1))} aria-label="Próximo mês" className="rounded-md border border-linha bg-white px-3 py-2">›</Link>
          </div>
          <CalendarioForca mesTexto={mesTexto} hoje={hoje} diaSelecionado={dia} href={href}
            registros={Object.fromEntries(registros.map((r) => [r.dia, { rpe: r.rpe, dor: r.dor }]))} />
          <p className="mt-2 text-sm text-suave">Dias marcados como “Feito” têm treino registrado. O contorno azul mostra o dia aberto ao lado.</p>
        </section>

        <section id="registro" className="scroll-mt-4 rounded-lg border border-linha bg-white p-5">
          <h2 className="font-titulo text-xl font-semibold">Retorno da sessão de {dataBr(dia)}</h2>
          {!podeRegistrar ? (
            registroDia ? <DetalheRegistro r={registroDia} /> : <p className="mt-3 text-suave">Sem registro neste dia.</p>
          ) : (
            <form action={salvarForca.bind(null, atletaId)} className="mt-4 grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="dia" value={dia} />
              <label className="block text-sm font-medium sm:col-span-2">Qual treino você fez?
                <input name="treino" defaultValue={registroDia?.treino ?? ""} maxLength={120} className={campo} placeholder="Ex.: Treino A, membros inferiores" />
              </label>
              <label className="block text-sm font-medium">Duração (minutos)
                <input name="duracao" type="number" min={1} max={300} required defaultValue={registroDia?.duracao_min ?? ""} className={campo} />
              </label>
              <label className="block text-sm font-medium">RPE da sessão
                <select name="rpe" required defaultValue={registroDia?.rpe ?? ""} className={campo}>
                  <option value="" disabled>Escolha</option>
                  {ROTULO_RPE.map((r, i) => <option key={i} value={i}>{r}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium sm:col-span-2">Como foi a execução?
                <select name="execucao" defaultValue={registroDia?.execucao ?? "completo"} className={campo}>
                  {Object.entries(ROTULO_EXECUCAO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">A carga, comparada ao planejado, foi
                <select name="carga" defaultValue={registroDia?.carga_percebida ?? "adequada"} className={campo}>
                  {Object.entries(ROTULO_CARGA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">Disposição antes de treinar
                <select name="disposicao" defaultValue={registroDia?.disposicao ?? ""} className={campo}>
                  <option value="">Não informar</option>
                  {ROTULO_DISPOSICAO.map((r, i) => <option key={i} value={i + 1}>{r}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">Dor ou desconforto
                <select name="dor" defaultValue={registroDia?.dor ?? "nenhuma"} className={campo}>
                  {Object.entries(ROTULO_DOR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">Onde? (se houve)
                <input name="dor_local" defaultValue={registroDia?.dor_local ?? ""} maxLength={120} className={campo} placeholder="Ex.: ombro direito" />
              </label>
              <label className="block text-sm font-medium sm:col-span-2">Comentário (opcional)
                <textarea name="comentario" rows={3} maxLength={1000} defaultValue={registroDia?.comentario ?? ""} className={campo} placeholder="Algo que a preparadora física deva saber" />
              </label>
              <p className="text-sm text-suave sm:col-span-2">Se a dor for forte, avise a comissão técnica antes do próximo treino.</p>
              <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                <button className="rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90">{registroDia ? "Atualizar registro" : "Salvar registro"}</button>
                {registroDia && <button formAction={excluirForca.bind(null, atletaId, dia)} formNoValidate className="text-sm text-suave underline">Excluir registro</button>}
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

function DetalheRegistro({ r }: { r: any }) {
  return (
    <dl className="mt-3 space-y-1 text-sm">
      <div><dt className="inline font-medium">Treino: </dt><dd className="inline">{r.treino ?? "-"}</dd></div>
      <div><dt className="inline font-medium">Duração e RPE: </dt><dd className="inline">{r.duracao_min} min · RPE {r.rpe}</dd></div>
      <div><dt className="inline font-medium">Execução: </dt><dd className="inline">{ROTULO_EXECUCAO[r.execucao]}</dd></div>
      <div><dt className="inline font-medium">Carga: </dt><dd className="inline">{ROTULO_CARGA[r.carga_percebida]}</dd></div>
      <div><dt className="inline font-medium">Dor: </dt><dd className="inline">{ROTULO_DOR[r.dor]}{r.dor_local ? ` (${r.dor_local})` : ""}</dd></div>
      {r.comentario && <div><dt className="inline font-medium">Comentário: </dt><dd className="inline">{r.comentario}</dd></div>}
    </dl>
  );
}

// Visão da comissão: como o grupo está cumprindo a musculação
async function VisaoGeral({ supabase, hoje, aviso }: { supabase: any; hoje: string; aviso: React.ReactNode }) {
  const desde7 = somarDias(hoje, -6);
  const [{ data: atletas }, { data: registros }] = await Promise.all([
    supabase.from("usuarios").select("id, nome").eq("papel", "atleta").eq("ativo", true).order("nome"),
    supabase.from("sessoes_forca").select("atleta_id, dia, rpe, dor").gte("dia", somarDias(hoje, -27)),
  ]);

  const linhas = ((atletas ?? []) as any[]).map((a) => {
    const meus = ((registros ?? []) as any[]).filter((r) => r.atleta_id === a.id);
    const ult7 = meus.filter((r) => r.dia >= desde7);
    const rpes = meus.filter((r) => r.rpe !== null).map((r) => r.rpe as number);
    const dor = ult7.reduce((pior, r) => (GRAVIDADE_DOR.indexOf(r.dor) > GRAVIDADE_DOR.indexOf(pior) ? r.dor : pior), "nenhuma");
    return {
      id: a.id as string, nome: a.nome as string, sessoes7: ult7.length, porSemana: meus.length / 4,
      rpeMedio: rpes.length ? media(rpes) : null, ultima: meus.reduce((m, r) => (r.dia > m ? r.dia : m), ""), dor,
    };
  });
  const comSessao = linhas.filter((l) => l.sessoes7 > 0).length;
  const comDor = linhas.filter((l) => GRAVIDADE_DOR.indexOf(l.dor) >= 2).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {aviso}
      <header>
        <h1 className="font-titulo text-3xl font-bold">Musculação do grupo</h1>
        <p className="text-suave">Registros feitos pelos atletas nos últimos 28 dias. Clique no nome para ver o calendário e o retorno de cada sessão.</p>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3" aria-label="Resumo do grupo">
        <CartaoIndicador rotulo="Atletas que treinaram nos últimos 7 dias" valor={`${comSessao}/${linhas.length}`} />
        <CartaoIndicador rotulo="Sessões registradas (7 dias)" valor={String(linhas.reduce((s, l) => s + l.sessoes7, 0))} />
        <CartaoIndicador rotulo="Atletas com dor moderada ou forte" valor={String(comDor)} destaque={comDor > 0} />
      </section>

      <section className="overflow-x-auto rounded-lg border border-linha bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-linha text-suave">
            <tr>
              <th className="px-4 py-3 font-medium">Atleta</th>
              <th className="px-4 py-3 font-medium">Sessões (7 dias)</th>
              <th className="px-4 py-3 font-medium">Média por semana (4 semanas)</th>
              <th className="px-4 py-3 font-medium">RPE médio</th>
              <th className="px-4 py-3 font-medium">Última sessão</th>
              <th className="px-4 py-3 font-medium">Dor (7 dias)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linha">
            {linhas.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-suave">Nenhum atleta cadastrado.</td></tr>}
            {linhas.map((l) => (
              <tr key={l.id} className={GRAVIDADE_DOR.indexOf(l.dor) >= 2 ? "bg-bola-100" : ""}>
                <td className="px-4 py-3 font-medium"><Link href={`/musculacao?atleta=${l.id}`} className="text-quadra-600 underline">{l.nome}</Link></td>
                <td className="px-4 py-3">{l.sessoes7}</td>
                <td className="px-4 py-3">{fmt1(l.porSemana)}</td>
                <td className="px-4 py-3">{l.rpeMedio === null ? "-" : fmt1(l.rpeMedio)}</td>
                <td className="px-4 py-3">{l.ultima ? dataCurta(l.ultima) : "Nenhum registro"}</td>
                <td className="px-4 py-3">{ROTULO_DOR[l.dor]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
