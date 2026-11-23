import Link from "next/link";
import { notFound } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar, podeVer } from "@/lib/permissions";
import { chaveDia, dataLonga } from "@/lib/datas";
import { Aviso } from "@/components/ui/Aviso";
import { carregarDesativados } from "@/lib/configuracoes";
import { COR_TIPO, ROTULO_PRESENCA, ROTULO_TIPO } from "@/components/calendario/tipos";
import { salvarPresencas, excluirSessao, adicionarExercicio, removerExercicio, salvarMeuRpe } from "../../actions";
import { ROTULO_RPE } from "@/components/monitorizacao/escalas";
import { hojeChave, somarDias } from "@/lib/periodo";

export default async function DetalheSessao({ params, searchParams }: { params: { id: string }; searchParams: { erro?: string; aviso?: string } }) {
  const { supabase, perfil } = await obterPerfil();
  const desativados = await carregarDesativados();

  const { data: sessao } = await supabase
    .from("sessoes")
    .select("id, titulo, tipo, inicio, duracao_min, local, adversario, observacoes, equipa_id, equipas(nome)")
    .eq("id", params.id).single();
  if (!sessao) notFound();

  const [{ data: membros }, { data: presencas }, { data: blocos }, { data: biblioteca }] = await Promise.all([
    supabase.from("membros_equipa").select("numero_camisa, usuarios(id, nome)").eq("equipa_id", sessao.equipa_id),
    supabase.from("presencas").select("atleta_id, status").eq("sessao_id", sessao.id),
    supabase.from("sessao_exercicios").select("ordem, duracao_min, exercicios(id, titulo)").eq("sessao_id", sessao.id).order("ordem"),
    supabase.from("exercicios").select("id, titulo").order("titulo"),
  ]);

  const statusDe: Record<string, string> = {};
  (presencas ?? []).forEach((p) => { statusDe[p.atleta_id] = p.status; });
  const atletas = ((membros ?? []) as any[]).map((m) => ({ ...m.usuarios, camisa: m.numero_camisa })).sort((a, b) => a.nome.localeCompare(b.nome));
  const editar = podeEditar(perfil.papel, "calendario");
  const equipaNome = (sessao.equipas as any)?.nome;

  // RPE registrado pelo próprio atleta: só para convocados, em sessões de uma fase de treinamento
  const diaSessao = chaveDia(sessao.inicio);
  let rpeAtleta: { mensagem: string | null; registro: { rpe: number; minutos: number } | null } | null = null;
  if (perfil.papel === "atleta" && !desativados.includes("monitorizacao")) {
    const { data: fasesDoDia } = await supabase.from("fases_treinamento").select("id, nome").lte("inicio", diaSessao).gte("fim", diaSessao);
    if ((fasesDoDia ?? []).length > 0) {
      const [{ data: convocado }, { data: registro }] = await Promise.all([
        supabase.from("fase_convocados").select("fase_id").eq("atleta_id", perfil.id).in("fase_id", (fasesDoDia ?? []).map((f) => f.id)).limit(1),
        supabase.from("rpe_sessao").select("rpe, minutos").eq("sessao_id", sessao.id).eq("atleta_id", perfil.id).maybeSingle(),
      ]);
      const naEquipa = atletas.some((a) => a.id === perfil.id);
      const comecou = new Date(sessao.inicio).getTime() <= Date.now();
      const noPrazo = diaSessao >= somarDias(hojeChave(), -1);
      let mensagem: string | null = null;
      if (!convocado?.length) mensagem = `Esta sessão faz parte da fase “${(fasesDoDia ?? []).map((f) => f.nome).join(", ")}”. O registro de RPE é só para os atletas convocados.`;
      else if (!naEquipa) mensagem = "O RPE é registrado pelos atletas da equipa desta sessão.";
      else if (!comecou) mensagem = "O registro abre quando a sessão começar.";
      else if (!noPrazo) mensagem = "O prazo para registrar o RPE desta sessão terminou.";
      rpeAtleta = { mensagem, registro: (registro as any) ?? null };
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/calendario?mes=${chaveDia(sessao.inicio).slice(0, 7)}`} className="text-sm text-quadra-600 underline">Voltar ao calendário</Link>

      <header>
        <span className={`inline-block rounded px-2 py-0.5 text-xs ${COR_TIPO[sessao.tipo]}`}>{ROTULO_TIPO[sessao.tipo]}</span>
        <h1 className="mt-2 font-titulo text-3xl font-bold">{sessao.titulo}</h1>
        <p className="text-suave">{dataLonga(sessao.inicio)} · {sessao.duracao_min} min</p>
        <p className="text-suave">{equipaNome}{sessao.local ? ` · ${sessao.local}` : ""}{sessao.adversario ? ` · contra ${sessao.adversario}` : ""}</p>
        {podeVer(perfil.papel, "monitorizacao") && !desativados.includes("monitorizacao") && (
          <p className="mt-3"><Link href={`/monitorizacao/rpe/${sessao.id}`} className="text-quadra-600 underline">Registrar carga (RPE) desta sessão</Link></p>
        )}
      </header>

      {rpeAtleta && (
        <section className="rounded-lg border border-linha bg-white p-5">
          <h2 className="mb-1 font-titulo text-xl font-semibold">Como foi o treino? (RPE)</h2>
          {rpeAtleta.registro && <p className="mb-3 text-sm text-suave">Você registrou RPE {rpeAtleta.registro.rpe} em {rpeAtleta.registro.minutos} min.</p>}
          {rpeAtleta.mensagem === null ? (
            <form action={salvarMeuRpe.bind(null, sessao.id)} className="grid gap-4 sm:grid-cols-2">
              <p className="text-sm text-suave sm:col-span-2">Preencha ao sair do treino: dê uma nota de 0 a 10 para o esforço da sessão inteira.</p>
              <label className="block text-sm font-medium">RPE da sessão
                <select name="rpe" required defaultValue={rpeAtleta.registro?.rpe ?? ""} className="mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5">
                  <option value="" disabled>Escolha</option>
                  {ROTULO_RPE.map((r, i) => <option key={i} value={i}>{r}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">Minutos que você treinou
                <input name="minutos" type="number" min={1} max={300} required defaultValue={rpeAtleta.registro?.minutos ?? sessao.duracao_min} className="mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5" />
              </label>
              <div className="sm:col-span-2"><button className="rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90">{rpeAtleta.registro ? "Atualizar RPE" : "Registrar RPE"}</button></div>
            </form>
          ) : (
            <p className="text-sm text-suave">{rpeAtleta.mensagem}</p>
          )}
        </section>
      )}

      <Aviso key={Date.now()} mensagem={searchParams.erro ?? searchParams.aviso} tipo={searchParams.erro ? "erro" : "ok"} />

      <section className="rounded-lg border border-linha bg-white p-5">
        <h2 className="mb-3 font-titulo text-xl font-semibold">Exercícios da sessão</h2>
        {perfil.papel === "atleta" && (blocos ?? []).length > 0 && <p className="mb-3 text-sm text-suave">Toque em um exercício para ver as instruções.</p>}
        {(blocos ?? []).length === 0 ? (
          <p className="text-suave">Nenhum exercício anexado ainda.</p>
        ) : (
          <ol className="divide-y divide-linha">
            {(blocos as any[]).map((b) => (
              <li key={b.ordem} className="flex items-center justify-between gap-3 py-2.5">
                <span>
                  <span className="mr-2 text-suave">{b.ordem}.</span>
                  <Link href={`/biblioteca/${b.exercicios.id}`} className="font-medium text-quadra-600 underline">{b.exercicios.titulo}</Link>
                  {b.duracao_min ? <span className="ml-2 text-sm text-suave">{b.duracao_min} min</span> : null}
                </span>
                {editar && <form action={removerExercicio.bind(null, sessao.id, b.ordem)}><button className="text-sm text-suave underline">Remover</button></form>}
              </li>
            ))}
          </ol>
        )}
        {editar && (biblioteca ?? []).length > 0 && (
          <form action={adicionarExercicio.bind(null, sessao.id)} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="min-w-56 flex-1 text-sm font-medium">Adicionar exercício
              <select name="exercicio" required className="mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5">
                {(biblioteca ?? []).map((x) => <option key={x.id} value={x.id}>{x.titulo}</option>)}
              </select>
            </label>
            <label className="w-28 text-sm font-medium">Minutos
              <input name="duracao" type="number" min={1} max={180} className="mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5" />
            </label>
            <button className="rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90">Adicionar</button>
          </form>
        )}
        {editar && (biblioteca ?? []).length === 0 && (
          <p className="mt-3 text-sm text-suave">Cadastre exercícios na <Link href="/biblioteca" className="text-quadra-600 underline">biblioteca</Link> para anexá-los aqui.</p>
        )}
      </section>

      {perfil.papel !== "atleta" && (
        <form action={salvarPresencas.bind(null, sessao.id)} className="rounded-lg border border-linha bg-white p-5">
        <h2 className="mb-3 font-titulo text-xl font-semibold">Presença</h2>
        {atletas.length === 0 ? (
          <p className="text-suave">Esta equipa ainda não tem atletas cadastrados.</p>
        ) : (
          <ul className="divide-y divide-linha">
            {atletas.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="font-medium">{a.camisa ? `${a.camisa} · ` : ""}{a.nome}</span>
                <select name={`p_${a.id}`} defaultValue={statusDe[a.id] ?? ""} disabled={!editar} aria-label={`Presença de ${a.nome}`} className="rounded-md border border-linha bg-white px-2 py-1.5 text-sm">
                  <option value="">Não registrado</option>
                  {Object.entries(ROTULO_PRESENCA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </li>
            ))}
          </ul>
        )}
        {editar && atletas.length > 0 && <button className="mt-4 rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90">Salvar presenças</button>}
      </form>
      )}

      {editar && (
        <div className="flex items-center gap-4">
          <Link href={`/calendario/sessao/${sessao.id}/editar`} className="rounded-md border border-linha bg-white px-4 py-2 text-sm hover:bg-fundo">Editar sessão</Link>
          <form action={excluirSessao.bind(null, sessao.id)}>
            <button className="text-sm text-suave underline">Excluir esta sessão</button>
          </form>
        </div>
      )}
    </div>
  );
}
