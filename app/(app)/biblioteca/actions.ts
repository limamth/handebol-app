"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const numero = (f: FormData, k: string) => { const v = texto(f, k); return v ? Number(v) : null; };
const lista = (f: FormData, k: string) => texto(f, k).split(",").map((s) => s.trim()).filter(Boolean);

export async function criarExercicio(formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  const erro = (m: string) => redirect("/biblioteca/novo?erro=" + encodeURIComponent(m));
  if (!podeEditar(perfil.papel, "biblioteca")) erro("Você não tem permissão para criar exercícios.");

  const { data, error } = await supabase.from("exercicios").insert({
    clube_id: perfil.clube_id,
    autor_id: perfil.id,
    titulo: texto(formData, "titulo"),
    descricao: texto(formData, "descricao") || null,
    objetivo: texto(formData, "objetivo"),
    duracao_min: numero(formData, "duracao"),
    intensidade_alvo: numero(formData, "intensidade"),
    jogadores_min: numero(formData, "jogadores"),
    materiais: lista(formData, "materiais"),
    tags: lista(formData, "tags"),
    pasta: texto(formData, "pasta") || null,
    video_url: texto(formData, "video") || null,
    diagrama_id: texto(formData, "diagrama") || null,
  }).select("id").single();
  if (error || !data) erro("Não foi possível salvar o exercício.");

  revalidatePath("/biblioteca");
  redirect(`/biblioteca/${data!.id}`);
}

export async function excluirExercicio(id: string) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "biblioteca")) redirect("/biblioteca?erro=" + encodeURIComponent("Você não tem permissão para excluir exercícios."));
  const { error } = await supabase.from("exercicios").delete().eq("id", id);
  if (error) redirect(`/biblioteca/${id}?erro=` + encodeURIComponent("Não foi possível excluir. Se este exercício estiver anexado a alguma sessão do calendário, remova-o de lá primeiro."));
  revalidatePath("/biblioteca");
  redirect("/biblioteca");
}

export async function atualizarExercicio(id: string, formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  const erro = (m: string) => redirect(`/biblioteca/${id}/editar?erro=` + encodeURIComponent(m));
  if (!podeEditar(perfil.papel, "biblioteca")) erro("Você não tem permissão para editar exercícios.");

  const { data, error } = await supabase.from("exercicios").update({
    titulo: texto(formData, "titulo"),
    descricao: texto(formData, "descricao") || null,
    objetivo: texto(formData, "objetivo"),
    duracao_min: numero(formData, "duracao"),
    intensidade_alvo: numero(formData, "intensidade"),
    jogadores_min: numero(formData, "jogadores"),
    materiais: lista(formData, "materiais"),
    tags: lista(formData, "tags"),
    pasta: texto(formData, "pasta") || null,
    video_url: texto(formData, "video") || null,
    diagrama_id: texto(formData, "diagrama") || null,
  }).eq("id", id).select("id").single();
  if (error || !data) erro("Não foi possível salvar as alterações.");

  revalidatePath("/biblioteca");
  revalidatePath(`/biblioteca/${id}`);
  redirect(`/biblioteca/${id}`);
}
