import Link from "next/link";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar, podeVer } from "@/lib/permissions";
import { garantirQuestionario, ESCALA_BEM_ESTAR } from "@/lib/monitorizacao";
import { hojeChave } from "@/lib/periodo";
import { salvarBemEstar } from "../actions";
import { Aviso } from "@/components/ui/Aviso";

const campo = "rounded-md border border-linha bg-white px-3 py-2 text-sm";

export default async function BemEstar({ searchParams }: { searchParams: { equipa?: string; dia?: string; aviso?: string } }) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeVer(perfil.papel, "monitorizacao")) redirect("/dashboard");

  const { data: equipas } = await supabase.from("equipas").select("id, nome").order("nome");
  const equipaId = searchParams.equipa || equipas?.[0]?.id;
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.dia ?? "") ? searchParams.dia! : hojeChave();
  const editar = podeEditar(perfil.papel, "monitorizacao");

  if (!equipaId) {
    return <p className="mx-auto max-w-3xl rounded-lg border border-dashed border-linha bg-white p-6 text-suave">Crie uma equipa em <Link href="/equipas" className="text-quadra-600 underline">Equipas</Link> para registrar o bem-estar.</p>;
  }

  const questionario = await garantirQuestionario(supabase, perfil.clube_id);
  const { data: fasesAtivas } = await supabase.from("fases_treinamento").select("nome, inicio, fim").lte("inicio", hojeChave()).gte("fim", hojeChave()).limit(1);
  const fase = fasesAtivas?.[0];
  const br = (d: string) => d.split("-").reverse().join("/");
  const [{ data: membros }, { data: respostas }] = await Promise.all([
    supabase.from("membros_equipa").select("numero_camisa, usuarios(id, nome)").eq("equipa_id", equipaId),
    questionario.id ? supabase.from("respostas_questionario").select("atleta_id, respostas").eq("questionario_id", questionario.id).eq("dia", dia) : Promise.resolve({ data: [] as any[] }),
  ]);

  const resp: Record<string, Record<string, number>> = {};
  (respostas ?? []).forEach((r: any) => { resp[r.atleta_id] = r.respostas; });
  const atletas = ((membros ?? []) as any[]).map((m) => ({ ...m.usuarios, camisa: m.numero_camisa })).sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/monitorizacao" className="text-sm text-quadra-600 underline">Voltar para a monitorização</Link>
      <h1 className="font-titulo text-3xl font-bold">Bem-estar dos atletas</h1>

      <p className="text-sm text-suave">
        {fase ? `Fase em andamento: ${fase.nome} (${br(fase.inicio)} a ${br(fase.fim)}). Os atletas já podem responder pelo próprio acesso. ` : "Nenhuma fase de treinamento em andamento: os atletas não conseguem responder pelo próprio acesso. "}
        <Link href="/monitorizacao/fases" className="text-quadra-600 underline">Gerenciar fases</Link>
      </p>

      <Aviso key={Date.now()} mensagem={searchParams.aviso} />

      <form action="/monitorizacao/bem-estar" className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium">Equipa
          <select name="equipa" defaultValue={equipaId} className={`mt-1 block ${campo}`}>
            {(equipas ?? []).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Data
          <input name="dia" type="date" defaultValue={dia} max={hojeChave()} className={`mt-1 block ${campo}`} />
        </label>
        <button className={campo}>Ver</button>
      </form>

      <p className="text-sm text-suave">{ESCALA_BEM_ESTAR} Só são salvos os atletas com todas as perguntas respondidas.</p>

      {questionario.id === null ? (
        <p className="rounded-lg border border-dashed border-linha bg-white p-6 text-suave">O questionário ainda não foi criado. Peça a um gestor ou à comissão técnica para abrir esta página uma vez.</p>
      ) : (
        <form action={salvarBemEstar.bind(null, equipaId, questionario.id, dia)} className="rounded-lg border border-linha bg-white p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-linha text-suave">
                <tr>
                  <th className="py-2 pr-4 font-medium">Atleta</th>
                  {questionario.perguntas.map((p) => <th key={p.chave} className="px-2 py-2 font-medium">{p.pergunta}{p.dica && <span className="block text-xs font-normal">{p.dica}</span>}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-linha">
                {atletas.length === 0 && <tr><td colSpan={6} className="py-6 text-suave">Esta equipa ainda não tem atletas.</td></tr>}
                {atletas.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-4 font-medium">{a.camisa ? `${a.camisa} · ` : ""}{a.nome}</td>
                    {questionario.perguntas.map((p) => (
                      <td key={p.chave} className="px-2 py-2">
                        <select name={`r_${a.id}__${p.chave}`} defaultValue={resp[a.id]?.[p.chave] ?? ""} disabled={!editar} aria-label={`${p.pergunta} de ${a.nome}`} className={campo}>
                          <option value="">-</option>
                          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editar && atletas.length > 0 && <button className="mt-4 rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90">Salvar respostas</button>}
        </form>
      )}
    </div>
  );
}
