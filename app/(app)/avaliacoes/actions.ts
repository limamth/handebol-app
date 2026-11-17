"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import { TESTES_SUGERIDOS } from "@/lib/monitorizacao";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const dataBr = (d: string) => d.split("-").reverse().join("/");

export async function criarTeste(formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  const voltar = (tipo: "aviso" | "erro", m: string) => redirect(`/avaliacoes?${tipo}=` + encodeURIComponent(m));
  if (!podeEditar(perfil.papel, "avaliacoes")) voltar("erro", "Você não tem permissão para criar testes.");

  const nome = texto(formData, "nome");
  const { error } = await supabase.from("definicoes_teste").insert({
    clube_id: perfil.clube_id, nome, categoria: texto(formData, "categoria") || null,
    unidade: texto(formData, "unidade"), menor_e_melhor: formData.get("menor") === "on",
  });
  if (error) voltar("erro", "Não foi possível criar o teste.");
  revalidatePath("/avaliacoes");
  voltar("aviso", `Teste criado: ${nome}.`);
}

export async function criarTestesSugeridos() {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "avaliacoes")) redirect("/avaliacoes?erro=" + encodeURIComponent("Você não tem permissão para criar testes."));
  const { error } = await supabase.from("definicoes_teste").insert(TESTES_SUGERIDOS.map((t) => ({ ...t, clube_id: perfil.clube_id })));
  if (error) redirect("/avaliacoes?erro=" + encodeURIComponent("Não foi possível adicionar os testes sugeridos."));
  revalidatePath("/avaliacoes");
  redirect("/avaliacoes?aviso=" + encodeURIComponent(`${TESTES_SUGERIDOS.length} testes sugeridos adicionados.`));
}

export async function registrarResultado(definicaoId: string, formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  const voltar = (tipo: "aviso" | "erro", m: string) => redirect(`/avaliacoes/${definicaoId}?${tipo}=` + encodeURIComponent(m));
  if (!podeEditar(perfil.papel, "avaliacoes")) voltar("erro", "Você não tem permissão para registrar resultados.");

  const valor = Number(texto(formData, "valor").replace(",", "."));
  const data = texto(formData, "data");
  const atletaId = texto(formData, "atleta");
  if (!Number.isFinite(valor) || !/^\d{4}-\d{2}-\d{2}$/.test(data)) voltar("erro", "Informe um valor numérico e a data.");

  const { error } = await supabase.from("resultados_teste").insert({
    definicao_id: definicaoId, atleta_id: atletaId, valor, medido_em: data, registrado_por: perfil.id,
  });
  if (error) voltar("erro", "Não foi possível registrar o resultado.");

  const [{ data: atleta }, { data: teste }] = await Promise.all([
    supabase.from("usuarios").select("nome").eq("id", atletaId).single(),
    supabase.from("definicoes_teste").select("nome, unidade").eq("id", definicaoId).single(),
  ]);
  revalidatePath(`/avaliacoes/${definicaoId}`);
  voltar("aviso", `Resultado registrado: ${atleta?.nome ?? "atleta"}, ${String(valor).replace(".", ",")} ${teste?.unidade ?? ""} em ${dataBr(data)}.`);
}

export async function excluirResultado(definicaoId: string, resultadoId: string) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "avaliacoes")) redirect(`/avaliacoes/${definicaoId}?erro=` + encodeURIComponent("Você não tem permissão para excluir resultados."));
  const { error } = await supabase.from("resultados_teste").delete().eq("id", resultadoId);
  if (error) redirect(`/avaliacoes/${definicaoId}?erro=` + encodeURIComponent("Não foi possível excluir o resultado."));
  revalidatePath(`/avaliacoes/${definicaoId}`);
  redirect(`/avaliacoes/${definicaoId}?aviso=` + encodeURIComponent("Resultado excluído."));
}

export async function excluirTeste(definicaoId: string) {
  const { supabase, perfil } = await obterPerfil();
  const voltar = (tipo: "aviso" | "erro", m: string) => redirect(`/avaliacoes?${tipo}=` + encodeURIComponent(m));
  if (!podeEditar(perfil.papel, "avaliacoes")) voltar("erro", "Você não tem permissão para excluir testes.");

  const { data: teste } = await supabase.from("definicoes_teste").select("nome, clube_id").eq("id", definicaoId).single();
  if (!teste) voltar("erro", "Teste não encontrado.");
  if (!teste!.clube_id) voltar("erro", "Testes da plataforma não podem ser excluídos.");

  const { count } = await supabase.from("resultados_teste").select("id", { count: "exact", head: true }).eq("definicao_id", definicaoId);
  const { error: erroResultados } = await supabase.from("resultados_teste").delete().eq("definicao_id", definicaoId);
  if (erroResultados) voltar("erro", "Não foi possível apagar os resultados deste teste.");

  const { data: apagados, error } = await supabase.from("definicoes_teste").delete().eq("id", definicaoId).select("id");
  if (error || !apagados?.length) voltar("erro", "Não foi possível excluir o teste.");

  revalidatePath("/avaliacoes"); revalidatePath("/dashboard");
  voltar("aviso", `Teste excluído: ${teste!.nome}${count ? ` (${count} resultado${count > 1 ? "s" : ""} apagado${count > 1 ? "s" : ""})` : ""}.`);
}
