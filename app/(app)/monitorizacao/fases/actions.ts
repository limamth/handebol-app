"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const voltar = (tipo: "aviso" | "erro", m: string) => redirect(`/monitorizacao/fases?${tipo}=${encodeURIComponent(m)}`);
const dataOk = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
const convocadosDe = (f: FormData) => [...new Set(f.getAll("convocado").map(String).filter((id) => /^[0-9a-f-]{36}$/i.test(id)))];
const plural = (n: number) => `${n} convocado${n === 1 ? "" : "s"}`;

function validar(formData: FormData) {
  const nome = texto(formData, "nome");
  const inicio = texto(formData, "inicio");
  const fim = texto(formData, "fim");
  if (!nome) voltar("erro", "Dê um nome à fase.");
  if (!dataOk(inicio) || !dataOk(fim)) voltar("erro", "Informe as datas de início e fim.");
  if (fim < inicio) voltar("erro", "A data final não pode ser antes da inicial.");
  return { nome, inicio, fim };
}

export async function criarFase(formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "monitorizacao")) voltar("erro", "Você não tem permissão para criar fases.");
  const dados = validar(formData);
  const convocados = convocadosDe(formData);

  const { data: fase, error } = await supabase.from("fases_treinamento").insert({ clube_id: perfil.clube_id, ...dados }).select("id").single();
  if (error || !fase) voltar("erro", "Não foi possível criar a fase.");

  if (convocados.length) {
    const { error: erroConv } = await supabase.from("fase_convocados").insert(convocados.map((atleta_id) => ({ fase_id: fase!.id, atleta_id })));
    if (erroConv) voltar("erro", "A fase foi criada, mas não foi possível salvar os convocados. Abra a fase e convoque de novo.");
  }
  revalidatePath("/monitorizacao/fases"); revalidatePath("/meu-bem-estar");
  voltar("aviso", `Fase criada: ${dados.nome} (${plural(convocados.length)}).${convocados.length ? "" : " Lembre de convocar os atletas: sem isso ninguém registra RPE nem bem-estar."}`);
}

export async function atualizarFase(faseId: string, formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "monitorizacao")) voltar("erro", "Você não tem permissão para editar fases.");
  const dados = validar(formData);
  const convocados = convocadosDe(formData);

  const { data, error } = await supabase.from("fases_treinamento").update(dados).eq("id", faseId).select("id");
  if (error || !data?.length) voltar("erro", "Não foi possível salvar as alterações.");

  const { error: erroLimpeza } = await supabase.from("fase_convocados").delete().eq("fase_id", faseId);
  if (erroLimpeza) voltar("erro", "Não foi possível atualizar os convocados.");
  if (convocados.length) {
    const { error: erroConv } = await supabase.from("fase_convocados").insert(convocados.map((atleta_id) => ({ fase_id: faseId, atleta_id })));
    if (erroConv) voltar("erro", "Os dados da fase foram salvos, mas não foi possível salvar os convocados. Tente de novo.");
  }
  revalidatePath("/monitorizacao/fases"); revalidatePath("/monitorizacao"); revalidatePath("/meu-bem-estar");
  voltar("aviso", `Fase atualizada (${plural(convocados.length)}).`);
}

export async function excluirFase(faseId: string) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "monitorizacao")) voltar("erro", "Você não tem permissão para excluir fases.");
  const { data, error } = await supabase.from("fases_treinamento").delete().eq("id", faseId).select("id");
  if (error || !data?.length) voltar("erro", "Não foi possível excluir a fase.");
  revalidatePath("/monitorizacao/fases"); revalidatePath("/meu-bem-estar");
  voltar("aviso", "Fase excluída. As respostas de bem-estar e os RPE já registrados continuam guardados.");
}
