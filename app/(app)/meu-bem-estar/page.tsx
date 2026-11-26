import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeVer } from "@/lib/permissions";
import { hojeChave } from "@/lib/periodo";
import { dataBr } from "@/lib/fases";
import { ESCALA_BEM_ESTAR, PERGUNTAS_BEM_ESTAR } from "@/lib/monitorizacao";
import { Aviso } from "@/components/ui/Aviso";
import { FormularioBemEstar } from "@/components/bem-estar/FormularioBemEstar";

export default async function MeuBemEstar({ searchParams }: { searchParams: { aviso?: string; erro?: string } }) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeVer(perfil.papel, "bemestar")) redirect("/dashboard");

  const hoje = hojeChave();
  const { data: fases } = await supabase.from("fases_treinamento").select("id, nome, inicio, fim").gte("fim", hoje).order("inicio");
  const { data: minhas } = await supabase.from("fase_convocados").select("fase_id").eq("atleta_id", perfil.id);
  const convocadoEm = new Set((minhas ?? []).map((c) => c.fase_id as string));
  const ativas = (fases ?? []).filter((f) => f.inicio <= hoje);
  const atual = ativas.find((f) => convocadoEm.has(f.id));
  const proxima = (fases ?? []).find((f) => f.inicio > hoje && convocadoEm.has(f.id));
  const aviso = <Aviso key={Date.now()} mensagem={searchParams.erro ?? searchParams.aviso} tipo={searchParams.erro ? "erro" : "ok"} />;

  if (!atual) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        {aviso}
        <h1 className="font-titulo text-3xl font-bold">Meu bem-estar</h1>
        <p className="rounded-lg border border-dashed border-linha bg-white p-6 text-suave">
          {ativas.length > 0
            ? `Há uma fase de treinamento em andamento (${ativas.map((f) => f.nome).join(", ")}), mas você não está na lista de convocados. Se isso estiver errado, fale com a comissão técnica.`
            : "O questionário de bem-estar fica aberto só durante as fases de treinamento, e não há nenhuma em andamento agora."}
          {proxima ? ` Você está convocado para “${proxima.nome}”, que começa em ${dataBr(proxima.inicio)}.` : ""}
        </p>
      </div>
    );
  }

  const { data: questionarioId } = await supabase.rpc("garantir_questionario");
  const [{ data: q }, { data: hojeResp }] = await Promise.all([
    supabase.from("questionarios").select("perguntas").eq("id", questionarioId).single(),
    supabase.from("respostas_questionario").select("respostas").eq("questionario_id", questionarioId).eq("atleta_id", perfil.id).eq("dia", hoje).maybeSingle(),
  ]);
  const perguntas = (q?.perguntas ?? PERGUNTAS_BEM_ESTAR) as typeof PERGUNTAS_BEM_ESTAR;
  const respostas = (hojeResp?.respostas ?? {}) as Record<string, number>;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {aviso}
      <header>
        <h1 className="font-titulo text-3xl font-bold">Meu bem-estar</h1>
        <p className="text-suave">{atual.nome} · {dataBr(atual.inicio)} a {dataBr(atual.fim)}</p>
      </header>

      <p className="text-sm">{hojeResp ? "Você já respondeu hoje. Se algo mudou, pode corrigir e salvar de novo." : "Responda como você está hoje. Leva menos de um minuto."}</p>
      <p className="text-sm text-suave">{ESCALA_BEM_ESTAR}</p>

      <FormularioBemEstar
        perguntas={perguntas}
        respostasIniciais={respostas}
        jaRespondeu={!!hojeResp}
        dia={hoje}
      />
    </div>
  );
}
