import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeChave } from "@/lib/periodo";
import type { Papel } from "@/types";

interface Props {
  perfilId: string;
  papel: Papel;
  clubeId: string;
}

export async function AlertaAtletaPendente({ perfilId, papel, clubeId }: Props) {
  // Apenas atletas precisam responder
  if (papel !== "atleta") return null;

  const supabase = criarClienteServidor();
  const hoje = hojeChave();

  // 1. Busca fases de treinamento ativas hoje
  const { data: fases } = await supabase
    .from("fases_treinamento")
    .select("id, nome, inicio, fim")
    .eq("clube_id", clubeId)
    .lte("inicio", hoje)
    .gte("fim", hoje);

  if (!fases || fases.length === 0) return null;

  const faseIds = fases.map((f) => f.id);

  // 2. Verifica se este atleta está convocado para alguma das fases ativas
  const { data: convocado } = await supabase
    .from("fase_convocados")
    .select("fase_id")
    .eq("atleta_id", perfilId)
    .in("fase_id", faseIds)
    .limit(1)
    .maybeSingle();

  if (!convocado) return null;

  const faseAtiva = fases.find((f) => f.id === convocado.fase_id) || fases[0];

  // 3. Busca questionário de bem-estar
  const { data: quest } = await supabase
    .from("questionarios")
    .select("id")
    .eq("clube_id", clubeId)
    .eq("nome", "Bem-estar diário")
    .maybeSingle();

  if (!quest) return null;

  // 4. Verifica se já respondeu hoje
  const { data: respostaHoje } = await supabase
    .from("respostas_questionario")
    .select("id")
    .eq("questionario_id", quest.id)
    .eq("atleta_id", perfilId)
    .eq("dia", hoje)
    .maybeSingle();

  // Se já respondeu hoje, não exibe o alerta
  if (respostaHoje) return null;

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-xs sm:text-sm text-amber-950 shadow-inner"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-amber-800 text-sm">
          🔔
        </span>
        <span>
          <strong>Lembrete:</strong> Você está convocado para a fase{" "}
          <strong className="underline decoration-amber-400">{faseAtiva.nome}</strong> e ainda não preencheu seu
          questionário de bem-estar de hoje.
        </span>
      </div>

      <Link
        href="/meu-bem-estar"
        className="rounded-md bg-amber-600 px-3 py-1 font-bold text-white shadow-sm hover:bg-amber-700 transition ml-auto"
      >
        Preencher agora →
      </Link>
    </div>
  );
}
