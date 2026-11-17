import Link from "next/link";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import { Aviso } from "@/components/ui/Aviso";
import { COR_RESULTADO } from "@/components/shootout/estilos";
import { hojeChave } from "@/lib/periodo";
import { ROTULO_RESULTADO, TIPOS_BATIDA, carregarAtletas, carregarFases, carregarGoleiros, dataBr, escolherFase, rotuloFase } from "@/lib/shootout";
import { atualizarBatida, excluirBatida } from "../actions";

const TAM = 40;
const campo = "mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5";
const um = (o: any) => (Array.isArray(o) ? o[0] : o);
const uuid = (v?: string) => !!v && /^[0-9a-f-]{36}$/i.test(v);
const dataOk = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
type Busca = { fase?: string; atleta?: string; goleiro?: string; de?: string; ate?: string; p?: string; aviso?: string; erro?: string };

export default async function Batidas({ searchParams }: { searchParams: Busca }) {
  const { supabase, perfil } = await obterPerfil();
  const editar = podeEditar(perfil.papel, "shootout");
  const hoje = hojeChave();
  const [fases, atletas, goleiros] = await Promise.all([carregarFases(supabase), carregarAtletas(supabase), carregarGoleiros(supabase)]);
  const fase = escolherFase(fases, searchParams.fase, hoje);
  const atleta = uuid(searchParams.atleta) ? searchParams.atleta! : "";
  const goleiro = uuid(searchParams.goleiro) ? searchParams.goleiro! : "";
  const de = dataOk(searchParams.de) ? searchParams.de! : "";
  const ate = dataOk(searchParams.ate) ? searchParams.ate! : "";
  const pagina = Math.max(0, Number(searchParams.p) || 0);

  let q = supabase.from("shootout_batidas")
    .select("id, resultado, tipo, observacao, batedor_id, batedor_externo, goleiro_id, goleiro_externo, criado_em, shootout_sessoes!inner(nome, data, fase_id)", { count: "exact" })
    .order("criado_em", { ascending: false }).range(pagina * TAM, pagina * TAM + TAM - 1);
  if (fase === "sem") q = q.is("shootout_sessoes.fase_id", null);
  else if (fase !== "todas") q = q.eq("shootout_sessoes.fase_id", fase);
  if (de) q = q.gte("shootout_sessoes.data", de);
  if (ate) q = q.lte("shootout_sessoes.data", ate);
  if (atleta) q = q.eq("batedor_id", atleta);
  if (goleiro) q = q.eq("goleiro_id", goleiro);
  const { data, count } = await q;
  const linhas = (data ?? []) as any[];
  const total = count ?? 0;

  const mantem = (p: number) => {
    const x = new URLSearchParams({ fase }); if (atleta) x.set("atleta", atleta); if (goleiro) x.set("goleiro", goleiro); if (de) x.set("de", de); if (ate) x.set("ate", ate); if (p > 0) x.set("p", String(p));
    return `/shootout/batidas?${x}`;
  };
  const urlAtual = mantem(pagina);
  const todosAtletas = [...atletas.entries()].sort((a, b) => a[1].nome.localeCompare(b[1].nome));
  const todosGoleiros = [...goleiros.keys()].map((id) => ({ id, nome: atletas.get(id)?.nome ?? "Goleiro" })).sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div className="space-y-4">
      <Aviso key={Date.now()} mensagem={searchParams.erro ?? searchParams.aviso} tipo={searchParams.erro ? "erro" : "ok"} />

      <form action="/shootout/batidas" className="grid gap-3 rounded-lg border border-linha bg-white p-4 sm:grid-cols-3">
        <label className="block text-sm font-medium">Fase
          <select name="fase" defaultValue={fase} className={campo}>
            <option value="todas">Todas as fases</option>
            {fases.map((f) => <option key={f.id} value={f.id}>{rotuloFase(f)}</option>)}
            <option value="sem">Sem fase</option>
          </select>
        </label>
        <label className="block text-sm font-medium">Atleta
          <select name="atleta" defaultValue={atleta} className={campo}><option value="">Todos</option>{todosAtletas.map(([id, a]) => <option key={id} value={id}>{a.nome}</option>)}</select>
        </label>
        <label className="block text-sm font-medium">Goleiro
          <select name="goleiro" defaultValue={goleiro} className={campo}><option value="">Todos</option>{todosGoleiros.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}</select>
        </label>
        <label className="block text-sm font-medium">De<input name="de" type="date" defaultValue={de} className={campo} /></label>
        <label className="block text-sm font-medium">Até<input name="ate" type="date" defaultValue={ate} className={campo} /></label>
        <div className="flex items-end"><button className="rounded-md border border-linha px-4 py-2.5 text-sm hover:bg-fundo">Filtrar</button></div>
      </form>

      <p className="text-sm text-suave">{total} batida{total === 1 ? "" : "s"} encontrada{total === 1 ? "" : "s"}. As mais recentes aparecem primeiro (pela ordem em que foram registradas).</p>

      <ul className="space-y-2">
        {linhas.length === 0 && <li className="rounded-lg border border-dashed border-linha bg-white p-5 text-suave">Nenhuma batida com esses filtros.</li>}
        {linhas.map((b) => {
          const s = um(b.shootout_sessoes);
          const nomeBatedor = b.batedor_externo ? "Atleta de fora" : atletas.get(b.batedor_id)?.nome ?? "Atleta removido";
          const nomeGoleiro = b.goleiro_externo ? "Adversário de fora" : b.goleiro_id ? atletas.get(b.goleiro_id)?.nome ?? "Goleiro" : "Goleiro removido";
          return (
            <li key={b.id} className="rounded-lg border border-linha bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{nomeBatedor} <span className="font-normal text-suave">contra</span> {nomeGoleiro}</p>
                  <p className="text-xs text-suave">{s?.nome ?? "Sessão"} · {dataBr(s?.data ?? "")}{b.observacao ? ` · ${b.observacao}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  {b.tipo && <span className="rounded border border-linha px-2 py-0.5 text-xs">{TIPOS_BATIDA[b.tipo]}</span>}
                  <span className={`rounded px-2 py-0.5 text-xs ${COR_RESULTADO[b.resultado]}`}>{ROTULO_RESULTADO[b.resultado]}</span>
                </div>
              </div>
              {editar && (
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-suave underline">Editar ou excluir</summary>
                  <form action={atualizarBatida.bind(null, b.id)} className="mt-2 grid gap-3 rounded-md bg-fundo p-3 sm:grid-cols-2">
                    <input type="hidden" name="volta" value={urlAtual} />
                    <label className="block font-medium">Atleta que bateu
                      <select name="batedor" defaultValue={b.batedor_externo ? "externo" : b.batedor_id ?? ""} className={campo}>
                        {todosAtletas.map(([id, a]) => <option key={id} value={id}>{a.nome}</option>)}
                        <option value="externo">Atleta de equipes de fora</option>
                      </select>
                    </label>
                    <label className="block font-medium">Goleiro
                      <select name="goleiro" defaultValue={b.goleiro_externo ? "externo" : b.goleiro_id ?? ""} className={campo}>
                        {!b.goleiro_externo && !b.goleiro_id && <option value="" disabled>Goleiro removido</option>}
                        {todosGoleiros.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                        <option value="externo">Adversários de fora</option>
                      </select>
                    </label>
                    <label className="block font-medium">Resultado
                      <select name="resultado" defaultValue={b.resultado} className={campo}>{Object.entries(ROTULO_RESULTADO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                    </label>
                    <label className="block font-medium">Tipo de batida
                      <select name="tipo" defaultValue={b.tipo ?? ""} className={campo}><option value="">Sem tipo</option>{Object.entries(TIPOS_BATIDA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                    </label>
                    <label className="block font-medium sm:col-span-2">Observação
                      <input name="observacao" maxLength={300} defaultValue={b.observacao ?? ""} className={campo} />
                    </label>
                    <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                      <button className="rounded-md bg-bola-500 px-4 py-2 font-semibold text-white hover:opacity-90">Salvar alterações</button>
                      <button formAction={excluirBatida.bind(null, b.id)} formNoValidate className="text-suave underline">Excluir esta batida</button>
                    </div>
                  </form>
                </details>
              )}
            </li>
          );
        })}
      </ul>

      {total > TAM && (
        <div className="flex items-center justify-between text-sm">
          {pagina > 0 ? <Link href={mantem(pagina - 1)} className="rounded-md border border-linha bg-white px-4 py-2 hover:bg-fundo">‹ Mais recentes</Link> : <span />}
          <span className="text-suave">Página {pagina + 1} de {Math.ceil(total / TAM)}</span>
          {(pagina + 1) * TAM < total ? <Link href={mantem(pagina + 1)} className="rounded-md border border-linha bg-white px-4 py-2 hover:bg-fundo">Mais antigas ›</Link> : <span />}
        </div>
      )}
    </div>
  );
}
