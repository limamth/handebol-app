"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";

export async function salvarRpe(sessaoId: string, formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  const voltar = (m?: string) => redirect(`/monitorizacao/rpe/${sessaoId}${m ? "?erro=" + encodeURIComponent(m) : "?salvo=1"}`);
  if (!podeEditar(perfil.papel, "monitorizacao")) voltar("Você não tem permissão para registrar carga.");

  const registrar: { sessao_id: string; atleta_id: string; rpe: number; minutos: number }[] = [];
  const limpar: string[] = [];
  for (const [chave, valor] of formData.entries()) {
    if (!chave.startsWith("rpe_")) continue;
    const atletaId = chave.slice(4);
    if (valor === "") { limpar.push(atletaId); continue; }
    const rpe = Number(valor);
    const minutos = Number(formData.get(`min_${atletaId}`));
    if (!Number.isInteger(rpe) || rpe < 0 || rpe > 10 || !(minutos > 0)) continue;
    registrar.push({ sessao_id: sessaoId, atleta_id: atletaId, rpe, minutos: Math.round(minutos) });
  }

  if (registrar.length) {
    const { error } = await supabase.from("rpe_sessao").upsert(registrar, { onConflict: "sessao_id,atleta_id" });
    if (error) voltar("Não foi possível salvar a carga.");
  }
  if (limpar.length) await supabase.from("rpe_sessao").delete().eq("sessao_id", sessaoId).in("atleta_id", limpar);

  revalidatePath("/monitorizacao");
  revalidatePath("/dashboard");
  voltar();
}

export async function salvarBemEstar(equipaId: string, questionarioId: string, dia: string, formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  const base = `/monitorizacao/bem-estar?equipa=${equipaId}&dia=${dia}`;
  if (!podeEditar(perfil.papel, "monitorizacao")) redirect(`${base}&aviso=` + encodeURIComponent("Você não tem permissão para registrar bem-estar."));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) redirect(`/monitorizacao/bem-estar?equipa=${equipaId}&aviso=` + encodeURIComponent("Data inválida."));

  const { data: q } = await supabase.from("questionarios").select("perguntas").eq("id", questionarioId).single();
  const chaves: string[] = ((q?.perguntas ?? []) as any[]).map((p) => p.chave);

  const porAtleta = new Map<string, Record<string, number>>();
  for (const [campo, valor] of formData.entries()) {
    if (!campo.startsWith("r_") || valor === "") continue;
    const [atletaId, chave] = campo.slice(2).split("__");
    const n = Number(valor);
    if (!chaves.includes(chave) || !Number.isInteger(n) || n < 1 || n > 5) continue;
    const atual = porAtleta.get(atletaId) ?? {};
    atual[chave] = n;
    porAtleta.set(atletaId, atual);
  }

  const completos = [...porAtleta].filter(([, r]) => chaves.every((c) => c in r));
  const incompletos = porAtleta.size - completos.length;
  if (completos.length) {
    const { error } = await supabase.from("respostas_questionario").upsert(
      completos.map(([atleta_id, respostas]) => ({ questionario_id: questionarioId, atleta_id, dia, respostas })),
      { onConflict: "questionario_id,atleta_id,dia" },
    );
    if (error) redirect(`${base}&aviso=` + encodeURIComponent("Não foi possível salvar as respostas."));
  }

  revalidatePath("/monitorizacao");
  revalidatePath("/dashboard");
  const aviso = `${completos.length} atleta(s) salvo(s).` + (incompletos ? ` ${incompletos} ficou(aram) de fora por ter perguntas sem resposta.` : "");
  redirect(`${base}&aviso=` + encodeURIComponent(aviso));
}
