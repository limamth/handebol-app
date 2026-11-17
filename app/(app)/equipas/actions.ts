"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const numero = (f: FormData, k: string) => { const v = texto(f, k); return v ? Number(v) : null; };
const voltarEquipa = (id: string, tipo: "aviso" | "erro", m: string) => redirect(`/equipas/${id}?${tipo}=${encodeURIComponent(m)}`);
const camisaValida = (n: number | null) => n === null || (Number.isInteger(n) && n >= 1 && n <= 99);

export async function criarEquipa(formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "equipas")) redirect("/equipas?erro=" + encodeURIComponent("Você não tem permissão para criar equipas."));

  const { data, error } = await supabase
    .from("equipas")
    .insert({ clube_id: perfil.clube_id, nome: texto(formData, "nome"), categoria: texto(formData, "categoria"), genero: texto(formData, "genero") || null })
    .select("id").single();

  if (error || !data) redirect("/equipas?erro=" + encodeURIComponent("Não foi possível criar a equipa."));
  revalidatePath("/equipas");
  redirect(`/equipas/${data.id}`);
}

export async function cadastrarAtleta(equipaId: string, formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "equipas")) voltarEquipa(equipaId, "erro", "Você não tem permissão para cadastrar atletas.");

  const { data: atleta, error } = await supabase
    .from("usuarios")
    .insert({ clube_id: perfil.clube_id, nome: texto(formData, "nome"), papel: "atleta", posicao: texto(formData, "posicao") || null, ano_nascimento: numero(formData, "ano") })
    .select("id").single();
  if (error || !atleta) return voltarEquipa(equipaId, "erro", "Não foi possível cadastrar o atleta.");

  const { error: erroVinculo } = await supabase
    .from("membros_equipa")
    .insert({ equipa_id: equipaId, usuario_id: atleta.id, numero_camisa: numero(formData, "camisa") });
  if (erroVinculo) return voltarEquipa(equipaId, "erro", "Atleta criado, mas não foi possível vincular à equipa.");

  revalidatePath(`/equipas/${equipaId}`);
  voltarEquipa(equipaId, "aviso", `${texto(formData, "nome")} cadastrado na equipa.`);
}

export async function atualizarEquipa(equipaId: string, formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "equipas")) voltarEquipa(equipaId, "erro", "Você não tem permissão para editar equipas.");

  const nome = texto(formData, "nome");
  const categoria = texto(formData, "categoria");
  if (!nome || !categoria) voltarEquipa(equipaId, "erro", "Informe o nome e a categoria.");

  const { data, error } = await supabase.from("equipas").update({ nome, categoria, genero: texto(formData, "genero") || null }).eq("id", equipaId).select("id");
  if (error || !data?.length) voltarEquipa(equipaId, "erro", "Não foi possível salvar as alterações.");

  revalidatePath("/equipas"); revalidatePath(`/equipas/${equipaId}`);
  voltarEquipa(equipaId, "aviso", "Equipa atualizada.");
}

export async function excluirEquipa(equipaId: string) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "equipas")) voltarEquipa(equipaId, "erro", "Você não tem permissão para excluir equipas.");

  const { data: equipa } = await supabase.from("equipas").select("nome").eq("id", equipaId).single();
  const { count } = await supabase.from("sessoes").select("id", { count: "exact", head: true }).eq("equipa_id", equipaId);

  const { data, error } = await supabase.from("equipas").delete().eq("id", equipaId).select("id");
  if (error || !data?.length) voltarEquipa(equipaId, "erro", "Não foi possível excluir a equipa.");

  revalidatePath("/equipas"); revalidatePath("/calendario"); revalidatePath("/dashboard"); revalidatePath("/monitorizacao");
  redirect("/equipas?aviso=" + encodeURIComponent(`Equipa excluída: ${equipa?.nome ?? ""}${count ? ` (${count} sessão${count > 1 ? "ões" : ""} também apagada${count > 1 ? "s" : ""})` : ""}. Os atletas continuam cadastrados.`));
}

export async function atualizarCamisa(equipaId: string, atletaId: string, formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "equipas")) voltarEquipa(equipaId, "erro", "Você não tem permissão para editar atletas.");

  const camisa = numero(formData, "camisa");
  if (!camisaValida(camisa)) voltarEquipa(equipaId, "erro", "O número da camisa deve ser de 1 a 99.");

  const { data, error } = await supabase.from("membros_equipa").update({ numero_camisa: camisa }).eq("equipa_id", equipaId).eq("usuario_id", atletaId).select("usuario_id");
  if (error || !data?.length) voltarEquipa(equipaId, "erro", "Não foi possível salvar o número.");

  revalidatePath(`/equipas/${equipaId}`);
  voltarEquipa(equipaId, "aviso", "Número da camisa atualizado.");
}

export async function removerDaEquipa(equipaId: string, atletaId: string) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "equipas")) voltarEquipa(equipaId, "erro", "Você não tem permissão para editar equipas.");

  const { data, error } = await supabase.from("membros_equipa").delete().eq("equipa_id", equipaId).eq("usuario_id", atletaId).select("usuario_id");
  if (error || !data?.length) voltarEquipa(equipaId, "erro", "Não foi possível remover o atleta da equipa.");

  revalidatePath(`/equipas/${equipaId}`); revalidatePath("/equipas");
  voltarEquipa(equipaId, "aviso", "Atleta removido da equipa. O cadastro e o histórico dele continuam.");
}

// Coloca o atleta em outra equipa; se "mover", tira da equipa atual.
async function colocarEmOutraEquipa(equipaId: string, atletaId: string, formData: FormData, mover: boolean) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "equipas")) voltarEquipa(equipaId, "erro", "Você não tem permissão para editar equipas.");

  const destino = texto(formData, "destino");
  if (!destino || destino === equipaId) voltarEquipa(equipaId, "erro", "Escolha a outra equipa.");
  const camisa = numero(formData, "camisa");
  if (!camisaValida(camisa)) voltarEquipa(equipaId, "erro", "O número da camisa deve ser de 1 a 99.");

  const { data: equipaDestino } = await supabase.from("equipas").select("nome").eq("id", destino).single();
  if (!equipaDestino) voltarEquipa(equipaId, "erro", "Equipa de destino não encontrada.");

  const { error } = await supabase.from("membros_equipa").upsert({ equipa_id: destino, usuario_id: atletaId, numero_camisa: camisa }, { onConflict: "equipa_id,usuario_id" });
  if (error) voltarEquipa(equipaId, "erro", "Não foi possível colocar o atleta na outra equipa.");

  if (mover) {
    const { error: erroRemocao } = await supabase.from("membros_equipa").delete().eq("equipa_id", equipaId).eq("usuario_id", atletaId);
    if (erroRemocao) voltarEquipa(equipaId, "erro", "O atleta entrou na outra equipa, mas não saiu desta. Remova-o manualmente.");
  }

  revalidatePath(`/equipas/${equipaId}`); revalidatePath(`/equipas/${destino}`); revalidatePath("/equipas");
  voltarEquipa(equipaId, "aviso", mover ? `Atleta movido para ${equipaDestino!.nome}.` : `Atleta adicionado também a ${equipaDestino!.nome}.`);
}

export async function moverParaEquipa(equipaId: string, atletaId: string, formData: FormData) {
  await colocarEmOutraEquipa(equipaId, atletaId, formData, true);
}

export async function adicionarEmOutraEquipa(equipaId: string, atletaId: string, formData: FormData) {
  await colocarEmOutraEquipa(equipaId, atletaId, formData, false);
}
