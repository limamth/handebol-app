import Link from "next/link";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import { Aviso } from "@/components/ui/Aviso";
import { chaveDia } from "@/lib/datas";
import { dataCurta, hojeChave } from "@/lib/periodo";
import { carregarFases, dataBr, rotuloFase, type Fase } from "@/lib/shootout";
import { atualizarSessao, criarSessao, excluirSessao } from "../actions";

const campo = "mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5";
const um = (o: any) => (Array.isArray(o) ? o[0] : o);

function Campos({ fases, calendario, v }: { fases: Fase[]; calendario: any[]; v?: any }) {
  return (
    <>
      <label className="block text-sm font-medium sm:col-span-2">Nome (opcional)
        <input name="nome" defaultValue={v?.nome ?? ""} maxLength={120} className={campo} placeholder="Ex.: Coletivos + shoot-out" />
      </label>
      <label className="block text-sm font-medium">Data
        <input name="data" type="date" defaultValue={v?.data ?? hojeChave()} className={campo} />
        <span className="mt-1 block text-xs font-normal text-suave">Ignorada se você ligar a uma sessão do calendário.</span>
      </label>
      <label className="block text-sm font-medium">Fase de treinamento
        <select name="fase" defaultValue={v ? (v.fase_id ?? "sem") : "auto"} className={campo}>
          <option value="auto">Automática (pela data)</option>
          {fases.map((f) => <option key={f.id} value={f.id}>{rotuloFase(f)}</option>)}
          <option value="sem">Sem fase</option>
        </select>
      </label>
      <label className="block text-sm font-medium sm:col-span-2">Ligar a uma sessão do calendário (opcional)
        <select name="calendario" defaultValue={v?.sessao_calendario_id ?? ""} className={campo}>
          <option value="">Sem ligação</option>
          {calendario.map((c) => <option key={c.id} value={c.id}>{dataCurta(chaveDia(c.inicio))} · {c.titulo}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium sm:col-span-2">Observações (opcional)
        <textarea name="observacoes" rows={2} maxLength={500} defaultValue={v?.observacoes ?? ""} className={campo} />
      </label>
    </>
  );
}

export default async function Sessoes({ searchParams }: { searchParams: { aviso?: string; erro?: string } }) {
  const { supabase, perfil } = await obterPerfil();
  const editar = podeEditar(perfil.papel, "shootout");

  const [{ data: sessoes }, fases, { data: calendario }] = await Promise.all([
    supabase.from("shootout_sessoes")
      .select("id, nome, data, observacoes, fase_id, sessao_calendario_id, shootout_batidas(count), fases_treinamento(nome), sessoes(titulo)")
      .order("data", { ascending: false }).order("criado_em", { ascending: false }).limit(200),
    carregarFases(supabase),
    editar ? supabase.from("sessoes").select("id, titulo, inicio").in("tipo", ["treino", "jogo"]).order("inicio", { ascending: false }).limit(80) : Promise.resolve({ data: [] as any[] }),
  ]);

  return (
    <div className="space-y-5">
      <Aviso key={Date.now()} mensagem={searchParams.erro ?? searchParams.aviso} tipo={searchParams.erro ? "erro" : "ok"} />

      {(sessoes ?? []).length === 0 ? (
        <p className="rounded-lg border border-dashed border-linha bg-white p-6 text-suave">Nenhuma sessão de shoot-out ainda.</p>
      ) : (
        <ul className="space-y-3">
          {(sessoes as any[]).map((s) => {
            const n = um(s.shootout_batidas)?.count ?? 0;
            const fase = um(s.fases_treinamento)?.nome;
            const cal = um(s.sessoes)?.titulo;
            return (
              <li key={s.id} className="rounded-lg border border-linha bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{s.nome ?? "Sessão"} <span className="font-normal text-suave">· {dataBr(s.data)}</span></p>
                    <p className="text-sm text-suave">{n} batida{n === 1 ? "" : "s"} · {fase ?? "sem fase"}{cal ? ` · ligada a “${cal}”` : ""}</p>
                    {s.observacoes && <p className="mt-1 text-sm text-suave">{s.observacoes}</p>}
                  </div>
                  {editar && <Link href={`/shootout/registro?sessao=${s.id}`} className="rounded-md bg-bola-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Registrar batidas</Link>}
                </div>
                {editar && (
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-suave underline">Editar ou excluir</summary>
                    <form action={atualizarSessao.bind(null, s.id)} className="mt-2 grid gap-3 rounded-md bg-fundo p-3 sm:grid-cols-2">
                      <Campos fases={fases} calendario={calendario ?? []} v={s} />
                      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                        <button className="rounded-md bg-bola-500 px-4 py-2 font-semibold text-white hover:opacity-90">Salvar alterações</button>
                        <button formAction={excluirSessao.bind(null, s.id)} formNoValidate className="text-suave underline">Excluir sessão{n ? ` e as ${n} batida${n > 1 ? "s" : ""}` : ""}</button>
                      </div>
                    </form>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editar && (
        <form action={criarSessao} className="grid gap-4 rounded-lg border border-linha bg-white p-5 sm:grid-cols-2">
          <h2 className="font-titulo text-xl font-semibold sm:col-span-2">Nova sessão de shoot-out</h2>
          <Campos fases={fases} calendario={calendario ?? []} />
          <div className="sm:col-span-2"><button className="rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90">Criar sessão e registrar batidas</button></div>
        </form>
      )}
    </div>
  );
}
