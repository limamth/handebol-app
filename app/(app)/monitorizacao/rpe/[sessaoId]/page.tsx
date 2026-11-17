import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar, podeVer } from "@/lib/permissions";
import { dataLonga } from "@/lib/datas";
import { ROTULO_PRESENCA } from "@/components/calendario/tipos";
import { ROTULO_RPE } from "@/components/monitorizacao/escalas";
import { salvarRpe } from "../../actions";
import { Aviso } from "@/components/ui/Aviso";

export default async function RegistrarRpe({ params, searchParams }: { params: { sessaoId: string }; searchParams: { erro?: string; salvo?: string } }) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeVer(perfil.papel, "monitorizacao")) redirect("/dashboard");

  const { data: sessao } = await supabase.from("sessoes").select("id, titulo, inicio, duracao_min, equipa_id, equipas(nome)").eq("id", params.sessaoId).single();
  if (!sessao) notFound();

  const [{ data: membros }, { data: presencas }, { data: registros }] = await Promise.all([
    supabase.from("membros_equipa").select("numero_camisa, usuarios(id, nome)").eq("equipa_id", sessao.equipa_id),
    supabase.from("presencas").select("atleta_id, status").eq("sessao_id", sessao.id),
    supabase.from("rpe_sessao").select("atleta_id, rpe, minutos, carga_ua").eq("sessao_id", sessao.id),
  ]);

  const presenca: Record<string, string> = {};
  (presencas ?? []).forEach((p) => { presenca[p.atleta_id] = p.status; });
  const registro: Record<string, any> = {};
  (registros ?? []).forEach((r) => { registro[r.atleta_id] = r; });
  const atletas = ((membros ?? []) as any[]).map((m) => ({ ...m.usuarios, camisa: m.numero_camisa })).sort((a, b) => a.nome.localeCompare(b.nome));
  const editar = podeEditar(perfil.papel, "monitorizacao");

  const lista = Object.values(registro);
  const mediaRpe = lista.length ? lista.reduce((s, r) => s + r.rpe, 0) / lista.length : null;
  const cargaTotal = lista.reduce((s, r) => s + r.carga_ua, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/monitorizacao" className="text-sm text-quadra-600 underline">Voltar para a monitorização</Link>
      <header>
        <h1 className="font-titulo text-3xl font-bold">Carga da sessão (RPE)</h1>
        <p className="text-suave">{sessao.titulo} · {dataLonga(sessao.inicio)} · {(sessao.equipas as any)?.nome}</p>
      </header>

      <Aviso key={Date.now()} mensagem={searchParams.erro ?? (searchParams.salvo ? "Carga da sessão salva." : undefined)} tipo={searchParams.erro ? "erro" : "ok"} />

      {lista.length > 0 && (
        <p className="text-sm text-suave">{lista.length} atleta(s) registrado(s) · RPE médio {mediaRpe!.toFixed(1).replace(".", ",")} · carga total {cargaTotal} UA</p>
      )}

      <form action={salvarRpe.bind(null, sessao.id)} className="rounded-lg border border-linha bg-white p-5">
        <p className="mb-3 text-sm text-suave">Deixe o RPE em branco para quem não treinou. O RPE é a nota que o atleta dá ao esforço da sessão inteira, de 0 a 10.</p>
        {atletas.length === 0 ? <p className="text-suave">Esta equipa ainda não tem atletas.</p> : (
          <ul className="divide-y divide-linha">
            {atletas.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span>
                  <span className="font-medium">{a.camisa ? `${a.camisa} · ` : ""}{a.nome}</span>
                  {presenca[a.id] && <span className="ml-2 text-xs text-suave">{ROTULO_PRESENCA[presenca[a.id]]}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <select name={`rpe_${a.id}`} defaultValue={registro[a.id]?.rpe ?? ""} disabled={!editar} aria-label={`RPE de ${a.nome}`} className="rounded-md border border-linha bg-white px-2 py-1.5 text-sm">
                    <option value="">Sem registro</option>
                    {ROTULO_RPE.map((r, i) => <option key={i} value={i}>{r}</option>)}
                  </select>
                  <input name={`min_${a.id}`} type="number" min={1} max={300} defaultValue={registro[a.id]?.minutos ?? sessao.duracao_min} disabled={!editar} aria-label={`Minutos de ${a.nome}`} className="w-20 rounded-md border border-linha bg-white px-2 py-1.5 text-sm" />
                  <span className="text-sm text-suave">min</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {editar && atletas.length > 0 && <button className="mt-4 rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90">Salvar carga</button>}
      </form>
    </div>
  );
}
