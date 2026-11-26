import Link from "next/link";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeVer, podeEditar } from "@/lib/permissions";
import { calcularMonitorizacao, carregarDia, convocadosDoDia, fmt1, garantirQuestionario, LIMITES, ROTULO_NOTA_DORES } from "@/lib/monitorizacao";
import { hojeChave, somarDias } from "@/lib/periodo";
import { dataLonga } from "@/lib/datas";
import { GraficoCarga } from "@/components/dashboard/GraficoCarga";
import { CartaoIndicador } from "@/components/dashboard/CartaoIndicador";
import { Aviso } from "@/components/ui/Aviso";
import { PainelLembreteBemEstar } from "@/components/monitorizacao/PainelLembreteBemEstar";
import { carregarConfiguracaoLembretes, buscarAtletasPendentesBemEstar } from "@/lib/notificacoes";
import { dispararLembreteManual, atualizarHorarioLembrete } from "./actions";

const botao = "rounded-md border border-linha bg-white px-3 py-2 text-sm hover:bg-fundo";
const dataBr = (d: string) => d.split("-").reverse().join("/");
const media = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

export default async function Monitorizacao({ searchParams }: { searchParams: { equipa?: string; data?: string; todos?: string; aviso?: string; erro?: string } }) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeVer(perfil.papel, "monitorizacao")) redirect("/dashboard");
  const podeGerenciar = podeEditar(perfil.papel, "monitorizacao");

  const hoje = hojeChave();
  const equipaId = searchParams.equipa || undefined;
  const todos = searchParams.todos === "1";
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.data ?? "") && searchParams.data! <= hoje ? searchParams.data! : hoje;
  const link = (d: string, t = todos) => `/monitorizacao?data=${d}${equipaId ? `&equipa=${equipaId}` : ""}${t ? "&todos=1" : ""}`;

  // Durante uma fase de treinamento, a lista mostra só os convocados (dá para ver todos)
  const convDia = await convocadosDoDia(supabase, dia);
  const convHoje = dia === hoje ? convDia : await convocadosDoDia(supabase, hoje);
  const filtroDia = convDia.fase && !todos ? convDia.ids : undefined;
  const filtroHoje = convHoje.fase && !todos ? convHoje.ids : undefined;

  const { data: equipas } = await supabase.from("equipas").select("id, nome").order("nome");
  const questionario = await garantirQuestionario(supabase, perfil.clube_id);
  const perguntas = questionario.perguntas;

  let recentes = supabase.from("sessoes").select("id, titulo, inicio, equipas(nome)").lte("inicio", new Date().toISOString()).order("inicio", { ascending: false }).limit(6);
  if (equipaId) recentes = recentes.eq("equipa_id", equipaId);

  const [{ linhas }, carga, { data: sessoes }, configLembretes, pendenciasLembretes] = await Promise.all([
    carregarDia(supabase, equipaId, dia, filtroDia),
    calcularMonitorizacao(supabase, equipaId, filtroHoje),
    recentes,
    carregarConfiguracaoLembretes(supabase, perfil.clube_id),
    buscarAtletasPendentesBemEstar(supabase, perfil.clube_id, hoje),
  ]);

  const responderam = linhas.filter((l) => l.respostas);
  const mediaDia = responderam.length ? media(responderam.map((l) => l.media ?? 0)) : null;
  const emAlerta = new Set(carga.alertas.map((a) => a.atletaId));
  const registrarHref = `/monitorizacao/bem-estar?${equipaId ? `equipa=${equipaId}&` : ""}dia=${dia}`;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Aviso key={Date.now()} mensagem={searchParams.erro ?? searchParams.aviso} tipo={searchParams.erro ? "erro" : "ok"} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-titulo text-3xl font-bold">Monitorização</h1>
          <p className="text-suave">Acompanhamento diário dos atletas, com ou sem treino no dia.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <form action="/monitorizacao" className="flex gap-2">
            <input type="hidden" name="data" value={dia} />
            {todos && <input type="hidden" name="todos" value="1" />}
            <select name="equipa" defaultValue={equipaId ?? ""} aria-label="Filtrar por equipa" className="rounded-md border border-linha bg-white px-3 py-2 text-sm">
              <option value="">Todas as equipas</option>
              {(equipas ?? []).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            <button className={botao}>Filtrar</button>
          </form>
          <Link href={registrarHref} className="rounded-md bg-bola-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Registrar bem-estar</Link>
          <Link href="/monitorizacao/fases" className={botao}>Fases de treinamento</Link>
        </div>
      </div>

      {/* Painel de Lembretes Diários para Atletas Convocados em Fase Ativa */}
      <PainelLembreteBemEstar
        configuracao={configLembretes}
        pendencias={pendenciasLembretes}
        podeEditar={podeGerenciar}
        onSalvarHorario={atualizarHorarioLembrete}
        onDispararManual={dispararLembreteManual}
      />

      <section aria-label="Acompanhamento do dia" className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={link(somarDias(dia, -1))} aria-label="Dia anterior" className={botao}>‹</Link>
          <h2 className="min-w-60 text-center font-titulo text-2xl font-semibold">{dia === hoje ? "Hoje, " : ""}{dataBr(dia)}</h2>
          {dia < hoje ? <Link href={link(somarDias(dia, 1))} aria-label="Próximo dia" className={botao}>›</Link> : <span className={`${botao} opacity-40`} aria-hidden>›</span>}
          {dia !== hoje && <Link href={link(hoje)} className="text-sm text-quadra-600 underline">Voltar para hoje</Link>}
          <form action="/monitorizacao" className="ml-auto flex items-center gap-2">
            {equipaId && <input type="hidden" name="equipa" value={equipaId} />}
            {todos && <input type="hidden" name="todos" value="1" />}
            <input name="data" type="date" defaultValue={dia} max={hoje} aria-label="Ir para a data" className="rounded-md border border-linha bg-white px-3 py-2 text-sm" />
            <button className={botao}>Ir</button>
          </form>
        </div>

        <p className="text-sm text-suave">
          {convDia.fase ? (
            <>Fase em andamento neste dia: <strong>{convDia.fase.nome}</strong>. {todos ? "Mostrando todos os atletas." : `Mostrando os ${convDia.ids.length} convocados.`}{" "}
              <Link href={link(dia, !todos)} className="text-quadra-600 underline">{todos ? "Ver só os convocados" : "Ver todos os atletas"}</Link></>
          ) : (
            <>Nenhuma fase de treinamento neste dia, então os atletas não conseguem registrar por conta própria. Mostrando todos os atletas; a comissão pode registrar em “Registrar bem-estar”.</>
          )}
        </p>

        <div className="grid grid-cols-3 gap-4">
          <CartaoIndicador rotulo="Responderam" valor={`${responderam.length}/${linhas.length}`} detalhe="questionário de bem-estar do dia" />
          <CartaoIndicador rotulo="Sem resposta" valor={String(linhas.length - responderam.length)} />
          <CartaoIndicador rotulo="Bem-estar médio" valor={mediaDia === null ? "-" : fmt1(mediaDia)} detalhe="escala de 1 a 5" />
        </div>

        <div className="overflow-x-auto rounded-lg border border-linha bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-linha text-suave">
              <tr>
                <th className="px-4 py-3 font-medium">Atleta</th>
                {perguntas.map((p) => (
                  <th key={p.chave} className="px-3 py-3 font-medium">{p.pergunta}{p.dica && <span className="block text-xs font-normal">{p.dica}</span>}</th>
                ))}
                <th className="px-3 py-3 font-medium">Média</th>
                <th className="px-3 py-3 font-medium">Carga do dia<span className="block text-xs font-normal">só se houve treino</span></th>
                <th className="px-3 py-3 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {linhas.length === 0 && (
                <tr><td colSpan={perguntas.length + 4} className="px-4 py-6 text-suave">
                  {filtroDia ? <>Nenhum atleta convocado para esta fase. Convoque em <Link href="/monitorizacao/fases" className="text-quadra-600 underline">Fases de treinamento</Link>.</> : "Nenhum atleta encontrado."}
                </td></tr>
              )}
              {linhas.map((l) => {
                const dor = l.respostas?.dores;
                const atencao = (typeof dor === "number" && dor <= LIMITES.doresAlerta) || (l.media !== null && l.media <= LIMITES.bemEstarBaixo);
                return (
                  <tr key={l.id} className={atencao ? "bg-bola-100" : ""}>
                    <td className="px-4 py-3 font-medium"><Link href={`/atletas/${l.id}`} className="text-quadra-600 underline">{l.nome}</Link></td>
                    {perguntas.map((p) => {
                      const v = l.respostas?.[p.chave];
                      return <td key={p.chave} className="px-3 py-3">{v === undefined ? "-" : p.chave === "dores" ? `${v} · ${ROTULO_NOTA_DORES[v] ?? ""}` : v}</td>;
                    })}
                    <td className="px-3 py-3">{l.media === null ? "-" : fmt1(l.media)}</td>
                    <td className="px-3 py-3">{l.carga === null ? "-" : `${Math.round(l.carga)} UA`}</td>
                    <td className="px-3 py-3">{l.respostas ? "Respondeu" : "Não respondeu"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="Carga de treino" className="space-y-4">
        <div>
          <h2 className="font-titulo text-2xl font-semibold">Carga de treino</h2>
          <p className="text-sm text-suave">
            Vem do RPE registrado nas sessões do calendário, pelos atletas convocados ou pela comissão. O treino de musculação não entra nesta carga.
            {filtroHoje ? " Mostrando os convocados da fase em andamento." : ""} Dias sem treino simplesmente não somam carga, e o acompanhamento diário acima continua valendo.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-linha bg-white p-5 lg:col-span-2">
            <h3 className="mb-3 font-titulo text-xl font-semibold">Últimos 7 dias (média por atleta)</h3>
            <GraficoCarga dados={carga.diario} />
          </div>
          <div className="rounded-lg border border-linha bg-white p-5">
            <h3 className="mb-3 font-titulo text-xl font-semibold">Registrar carga (RPE)</h3>
            {(sessoes ?? []).length === 0 ? <p className="text-sm text-suave">Nenhuma sessão realizada ainda.</p> : (
              <ul className="space-y-3">
                {(sessoes as any[]).map((s) => (
                  <li key={s.id}>
                    <Link href={`/monitorizacao/rpe/${s.id}`} className="font-medium text-quadra-600 underline">{s.titulo}</Link>
                    <p className="text-sm text-suave">{dataLonga(s.inicio)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-linha bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-linha text-suave">
              <tr>
                <th className="px-4 py-3 font-medium">Atleta</th>
                <th className="px-4 py-3 font-medium">Carga 7 dias</th>
                <th className="px-4 py-3 font-medium">Média semanal (4 semanas)</th>
                <th className="px-4 py-3 font-medium">Razão</th>
                <th className="px-4 py-3 font-medium">Bem-estar (3 últimas respostas)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {carga.metricas.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-suave">Nenhum atleta encontrado.</td></tr>}
              {carga.metricas.map((m) => (
                <tr key={m.id} className={emAlerta.has(m.id) ? "bg-bola-100" : ""}>
                  <td className="px-4 py-3 font-medium"><Link href={`/atletas/${m.id}`} className="text-quadra-600 underline">{m.nome}</Link></td>
                  <td className="px-4 py-3">{Math.round(m.carga7)} UA</td>
                  <td className="px-4 py-3">{Math.round(m.semanalCronica)} UA</td>
                  <td className="px-4 py-3">{m.razao === null ? "-" : fmt1(m.razao)}</td>
                  <td className="px-4 py-3">{m.bemEstar === null ? "-" : `${fmt1(m.bemEstar)} / 5`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="max-w-3xl text-sm text-suave">
          UA (unidades arbitrárias) = RPE × minutos. A razão divide a carga dos últimos 7 dias pela média semanal dos últimos 28 dias; acima de {fmt1(LIMITES.razaoAlta)} (com pelo menos {LIMITES.minSessoesParaRazao} registros) o atleta entra em alerta.
          Também geram alerta, nos últimos {LIMITES.diasAlerta} dias, o bem-estar do dia com média de {fmt1(LIMITES.bemEstarBaixo)} ou menos e a nota de dores {LIMITES.doresAlerta} ou menos. Esses limites ficam em <code>lib/monitorizacao.ts</code>. As informações de dor ficam na aba <Link href="/dores" className="text-quadra-600 underline">Dores</Link>.
        </p>
      </section>
    </div>
  );
}
