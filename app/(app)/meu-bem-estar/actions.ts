"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterPerfil } from "@/lib/sessao";
import { hojeChave } from "@/lib/periodo";
import { PERGUNTAS_BEM_ESTAR } from "@/lib/monitorizacao";

export async function salvarMeuBemEstar(formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  const voltar = (tipo: "aviso" | "erro", m: string) => redirect(`/meu-bem-estar?${tipo}=${encodeURIComponent(m)}`);
  if (perfil.papel !== "atleta") redirect("/dashboard");

  // O dia vem do servidor, nunca do formulário: só vale responder pelo dia de hoje
  const hoje = hojeChave();
  const { data: ativas } = await supabase.from("fases_treinamento").select("id").lte("inicio", hoje).gte("fim", hoje);
  const idsAtivas = (ativas ?? []).map((f) => f.id);
  if (!idsAtivas.length) voltar("erro", "O bem-estar só pode ser registrado durante uma fase de treinamento.");
  const { data: convocado } = await supabase.from("fase_convocados").select("fase_id").eq("atleta_id", perfil.id).in("fase_id", idsAtivas).limit(1);
  if (!convocado?.length) voltar("erro", "Você não está na lista de convocados desta fase. Fale com a comissão técnica.");

  const { data: questionarioId } = await supabase.rpc("garantir_questionario");
  if (!questionarioId) voltar("erro", "Não foi possível abrir o questionário. Tente de novo.");
  const { data: q } = await supabase.from("questionarios").select("perguntas").eq("id", questionarioId).single();
  const chaves = ((q?.perguntas ?? PERGUNTAS_BEM_ESTAR) as { chave: string }[]).map((p) => p.chave);

  const respostas: Record<string, number> = {};
  for (const chave of chaves) {
    const n = Number(formData.get(`r_${chave}`));
    if (!Number.isInteger(n) || n < 1 || n > 5) voltar("erro", "Responda todas as perguntas com notas de 1 a 5.");
    respostas[chave] = n;
  }

  const { data: ja } = await supabase.from("respostas_questionario").select("id").eq("questionario_id", questionarioId).eq("atleta_id", perfil.id).eq("dia", hoje).maybeSingle();
  const { error } = await supabase.from("respostas_questionario").upsert(
    { questionario_id: questionarioId, atleta_id: perfil.id, dia: hoje, respostas },
    { onConflict: "questionario_id,atleta_id,dia" },
  );
  if (error) voltar("erro", "Não foi possível salvar. Confira se a fase de treinamento ainda está em andamento.");

  revalidatePath("/meu-bem-estar");
  revalidatePath("/monitorizacao");
  voltar("aviso", ja ? "Resposta de hoje atualizada." : "Bem-estar de hoje registrado. Obrigado!");
}
