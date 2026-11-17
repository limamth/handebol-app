import Link from "next/link";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar, podeVer } from "@/lib/permissions";
import { hojeChave } from "@/lib/periodo";
import { dataBr, ROTULO_STATUS_FASE, statusFase } from "@/lib/fases";
import { Aviso } from "@/components/ui/Aviso";
import { SeletorConvocados } from "@/components/fases/SeletorConvocados";
import { atualizarFase, criarFase, excluirFase } from "./actions";

const campo = "mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5";
const um = (o: any) => (Array.isArray(o) ? o[0] : o);

export default async function Fases({ searchParams }: { searchParams: { aviso?: string; erro?: string } }) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeVer(perfil.papel, "monitorizacao")) redirect("/dashboard");
  const editar = podeEditar(perfil.papel, "monitorizacao");
  const hoje = hojeChave();

  const [{ data: fases }, { data: convocacoes }, { data: lista }] = await Promise.all([
    supabase.from("fases_treinamento").select("id, nome, inicio, fim").order("inicio", { ascending: false }),
    supabase.from("fase_convocados").select("fase_id, atleta_id"),
    supabase.from("usuarios").select("id, nome, membros_equipa(equipas(nome))").eq("papel", "atleta").eq("ativo", true).order("nome"),
  ]);

  const atletas = ((lista ?? []) as any[]).map((a) => ({
    id: a.id as string, nome: a.nome as string,
    equipas: (a.membros_equipa ?? []).map((m: any) => um(m.equipas)?.nome).filter(Boolean).join(", "),
  }));
  const convocadosDe = (faseId: string) => ((convocacoes ?? []) as any[]).filter((c) => c.fase_id === faseId).map((c) => c.atleta_id as string);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Aviso key={Date.now()} mensagem={searchParams.erro ?? searchParams.aviso} tipo={searchParams.erro ? "erro" : "ok"} />
      <Link href="/monitorizacao" className="text-sm text-quadra-600 underline">Voltar para a monitorização</Link>
      <header>
        <h1 className="font-titulo text-3xl font-bold">Fases de treinamento</h1>
        <p className="text-suave">Nos dias de uma fase, só os atletas convocados registram o RPE dos treinos e o bem-estar. Fora das datas, ou sem convocação, o registro fica fechado. Todos os atletas continuam vendo o calendário e os treinos.</p>
      </header>

      {(fases ?? []).length === 0 ? (
        <p className="rounded-lg border border-dashed border-linha bg-white p-6 text-suave">Nenhuma fase cadastrada. Sem uma fase em andamento, os atletas não conseguem registrar RPE nem bem-estar.</p>
      ) : (
        <ul className="space-y-3">
          {(fases ?? []).map((f) => {
            const status = statusFase(f, hoje);
            const convocados = convocadosDe(f.id);
            return (
              <li key={f.id} className="rounded-lg border border-linha bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{f.nome}</p>
                    <p className="text-sm text-suave">{dataBr(f.inicio)} a {dataBr(f.fim)} · {convocados.length} convocado{convocados.length === 1 ? "" : "s"}</p>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-xs ${status === "em_andamento" ? "bg-emerald-700 text-white" : status === "futura" ? "bg-quadra-600 text-white" : "bg-slate-500 text-white"}`}>{ROTULO_STATUS_FASE[status]}</span>
                </div>
                {editar && (
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-suave underline">Editar, convocar ou excluir</summary>
                    <form action={atualizarFase.bind(null, f.id)} className="mt-2 grid gap-3 rounded-md bg-fundo p-3 sm:grid-cols-2">
                      <label className="block font-medium sm:col-span-2">Nome<input name="nome" required defaultValue={f.nome} className={campo} /></label>
                      <label className="block font-medium">Início<input name="inicio" type="date" required defaultValue={f.inicio} className={campo} /></label>
                      <label className="block font-medium">Fim<input name="fim" type="date" required defaultValue={f.fim} className={campo} /></label>
                      <SeletorConvocados atletas={atletas} selecionados={convocados} />
                      <div className="flex items-center gap-4 sm:col-span-2">
                        <button className="rounded-md bg-bola-500 px-4 py-2 font-semibold text-white hover:opacity-90">Salvar alterações</button>
                        <button formAction={excluirFase.bind(null, f.id)} formNoValidate className="text-suave underline">Excluir esta fase</button>
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
        <form action={criarFase} className="grid gap-4 rounded-lg border border-linha bg-white p-5 sm:grid-cols-2">
          <h2 className="font-titulo text-xl font-semibold sm:col-span-2">Nova fase de treinamento</h2>
          <label className="block text-sm font-medium sm:col-span-2">Nome<input name="nome" required className={campo} placeholder="Ex.: Concentração antes do Mundial" /></label>
          <label className="block text-sm font-medium">Primeiro dia<input name="inicio" type="date" required defaultValue={hoje} className={campo} /></label>
          <label className="block text-sm font-medium">Último dia<input name="fim" type="date" required defaultValue={hoje} className={campo} /></label>
          <SeletorConvocados atletas={atletas} selecionados={[]} />
          <div className="sm:col-span-2"><button className="rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90">Criar fase</button></div>
        </form>
      )}
    </div>
  );
}
