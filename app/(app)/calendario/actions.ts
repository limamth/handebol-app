"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import { OFFSET } from "@/lib/datas";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function criarSessao(formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  const erro = (m: string) => redirect("/calendario?erro=" + encodeURIComponent(m));
  if (!podeEditar(perfil.papel, "calendario")) erro("Você não tem permissão para agendar sessões.");

  const inicioLocal = texto(formData, "inicio"); // ex.: 2026-10-23T15:45
  if (!inicioLocal) erro("Informe data e hora.");

  const { error } = await supabase.from("sessoes").insert({
    equipa_id: texto(formData, "equipa"),
    tipo: texto(formData, "tipo"),
    titulo: texto(formData, "titulo"),
    inicio: `${inicioLocal}:00${OFFSET}`,
    duracao_min: Number(texto(formData, "duracao")) || 90,
    local: texto(formData, "local") || null,
    adversario: texto(formData, "adversario") || null,
    criado_por: perfil.id,
  });
  if (error) erro("Não foi possível agendar a sessão.");

  revalidatePath("/calendario");
  redirect(`/calendario?mes=${inicioLocal.slice(0, 7)}`);
}

export async function salvarPresencas(sessaoId: string, formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  const voltar = (m?: string) => redirect(`/calendario/sessao/${sessaoId}${m ? "?erro=" + encodeURIComponent(m) : ""}`);
  if (!podeEditar(perfil.papel, "calendario")) voltar("Você não tem permissão para registrar presenças.");

  const registrar: { sessao_id: string; atleta_id: string; status: string }[] = [];
  const limpar: string[] = [];
  for (const [chave, valor] of formData.entries()) {
    if (!chave.startsWith("p_")) continue;
    const atletaId = chave.slice(2);
    if (valor) registrar.push({ sessao_id: sessaoId, atleta_id: atletaId, status: String(valor) });
    else limpar.push(atletaId);
  }

  if (registrar.length) {
    const { error } = await supabase.from("presencas").upsert(registrar, { onConflict: "sessao_id,atleta_id" });
    if (error) voltar("Não foi possível salvar as presenças.");
  }
  if (limpar.length) await supabase.from("presencas").delete().eq("sessao_id", sessaoId).in("atleta_id", limpar);

  revalidatePath(`/calendario/sessao/${sessaoId}`);
  voltar();
}

export async function excluirSessao(sessaoId: string) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "calendario")) redirect("/calendario?erro=" + encodeURIComponent("Você não tem permissão para excluir sessões."));
  await supabase.from("sessoes").delete().eq("id", sessaoId);
  revalidatePath("/calendario");
  redirect("/calendario");
}

export async function adicionarExercicio(sessaoId: string, formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  const voltar = (m?: string) => redirect(`/calendario/sessao/${sessaoId}${m ? "?erro=" + encodeURIComponent(m) : ""}`);
  if (!podeEditar(perfil.papel, "calendario")) voltar("Você não tem permissão para alterar esta sessão.");

  const { data: ultimo } = await supabase.from("sessao_exercicios").select("ordem").eq("sessao_id", sessaoId).order("ordem", { ascending: false }).limit(1);
  const duracao = Number(texto(formData, "duracao"));
  const { error } = await supabase.from("sessao_exercicios").insert({
    sessao_id: sessaoId,
    exercicio_id: texto(formData, "exercicio"),
    ordem: (ultimo?.[0]?.ordem ?? 0) + 1,
    duracao_min: duracao > 0 ? duracao : null,
  });
  if (error) voltar("Não foi possível adicionar o exercício.");

  revalidatePath(`/calendario/sessao/${sessaoId}`);
  voltar();
}

export async function removerExercicio(sessaoId: string, ordem: number) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "calendario")) redirect(`/calendario/sessao/${sessaoId}`);
  await supabase.from("sessao_exercicios").delete().eq("sessao_id", sessaoId).eq("ordem", ordem);
  revalidatePath(`/calendario/sessao/${sessaoId}`);
  redirect(`/calendario/sessao/${sessaoId}`);
}

export async function atualizarSessao(sessaoId: string, formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  const erro = (m: string) => redirect(`/calendario/sessao/${sessaoId}/editar?erro=` + encodeURIComponent(m));
  if (!podeEditar(perfil.papel, "calendario")) erro("Você não tem permissão para editar sessões.");

  const inicioLocal = texto(formData, "inicio");
  if (!inicioLocal) erro("Informe data e hora.");

  const { data, error } = await supabase.from("sessoes").update({
    tipo: texto(formData, "tipo"),
    titulo: texto(formData, "titulo"),
    inicio: `${inicioLocal}:00${OFFSET}`,
    duracao_min: Number(texto(formData, "duracao")) || 90,
    local: texto(formData, "local") || null,
    adversario: texto(formData, "adversario") || null,
    observacoes: texto(formData, "observacoes") || null,
  }).eq("id", sessaoId).select("id");
  if (error || !data?.length) erro("Não foi possível salvar as alterações.");

  revalidatePath("/calendario");
  revalidatePath(`/calendario/sessao/${sessaoId}`);
  redirect(`/calendario/sessao/${sessaoId}?aviso=` + encodeURIComponent("Sessão atualizada."));
}

// O atleta registra o RPE da sessão ao sair do treino. Quem pode (convocado, equipa, prazo) é decidido pelo banco.
export async function salvarMeuRpe(sessaoId: string, formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  const voltar = (tipo: "aviso" | "erro", m: string) => redirect(`/calendario/sessao/${sessaoId}?${tipo}=${encodeURIComponent(m)}`);
  if (perfil.papel !== "atleta") voltar("erro", "Este registro é feito pelos atletas. A comissão usa a tela de Monitorização.");

  const rpe = Number(texto(formData, "rpe"));
  const minutos = Number(texto(formData, "minutos"));
  if (!Number.isInteger(rpe) || rpe < 0 || rpe > 10) voltar("erro", "Escolha o RPE de 0 a 10.");
  if (!(minutos >= 1 && minutos <= 300)) voltar("erro", "Informe os minutos de 1 a 300.");

  const { error } = await supabase.from("rpe_sessao").upsert(
    { sessao_id: sessaoId, atleta_id: perfil.id, rpe, minutos: Math.round(minutos) },
    { onConflict: "sessao_id,atleta_id" },
  );
  if (error) voltar("erro", "Não foi possível registrar. Confira se você está convocado para esta fase e se o prazo não passou.");

  revalidatePath(`/calendario/sessao/${sessaoId}`);
  revalidatePath("/monitorizacao");
  voltar("aviso", `RPE ${rpe} registrado (${Math.round(minutos)} min). Obrigado!`);
}
