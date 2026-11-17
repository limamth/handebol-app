"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import { hojeChave } from "@/lib/periodo";
import { PERGUNTAS_BEM_ESTAR } from "@/lib/monitorizacao";

// Alfabeto sem letras e números parecidos (0/O, 1/I). 32 símbolos dividem 256 sem viés.
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const gerarCodigo = () => Array.from(randomBytes(8), (b) => ALFABETO[b % 32]).join("");

export async function gerarConvite(atletaId: string) {
  const { supabase, perfil } = await obterPerfil();
  const voltar = (tipo: "aviso" | "erro", msg: string) => redirect(`/atletas/${atletaId}?${tipo}=${encodeURIComponent(msg)}`);
  if (!["gestor", "comissao_tecnica"].includes(perfil.papel)) voltar("erro", "Você não tem permissão para gerar códigos de acesso.");

  const { error } = await supabase.from("convites").upsert({ usuario_id: atletaId, codigo: gerarCodigo() }, { onConflict: "usuario_id" });
  if (error) voltar("erro", "Não foi possível gerar o código.");

  revalidatePath(`/atletas/${atletaId}`);
  voltar("aviso", "Código de acesso gerado.");
}

const voltarFicha = (atletaId: string, tipo: "aviso" | "erro", msg: string) => redirect(`/atletas/${atletaId}?${tipo}=${encodeURIComponent(msg)}`);
const dataBr = (d: string) => d.split("-").reverse().join("/");

// ---- Bem-estar ----
export async function atualizarBemEstar(atletaId: string, respostaId: string, formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "monitorizacao")) voltarFicha(atletaId, "erro", "Você não tem permissão para editar o bem-estar.");

  const { data: registro } = await supabase.from("respostas_questionario").select("questionario_id").eq("id", respostaId).eq("atleta_id", atletaId).single();
  if (!registro) voltarFicha(atletaId, "erro", "Registro de bem-estar não encontrado.");
  const { data: q } = await supabase.from("questionarios").select("perguntas").eq("id", registro!.questionario_id).single();
  const chaves = ((q?.perguntas ?? PERGUNTAS_BEM_ESTAR) as { chave: string }[]).map((p) => p.chave);

  const respostas: Record<string, number> = {};
  for (const chave of chaves) {
    const n = Number(formData.get(`r_${chave}`));
    if (!Number.isInteger(n) || n < 1 || n > 5) voltarFicha(atletaId, "erro", "Responda todas as perguntas com notas de 1 a 5.");
    respostas[chave] = n;
  }

  const { data, error } = await supabase.from("respostas_questionario").update({ respostas }).eq("id", respostaId).eq("atleta_id", atletaId).select("id");
  if (error || !data?.length) voltarFicha(atletaId, "erro", "Não foi possível salvar as alterações.");

  revalidatePath(`/atletas/${atletaId}`); revalidatePath("/monitorizacao"); revalidatePath("/dashboard");
  voltarFicha(atletaId, "aviso", "Bem-estar atualizado.");
}

export async function excluirBemEstar(atletaId: string, respostaId: string) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "monitorizacao")) voltarFicha(atletaId, "erro", "Você não tem permissão para excluir o bem-estar.");

  const { data, error } = await supabase.from("respostas_questionario").delete().eq("id", respostaId).eq("atleta_id", atletaId).select("id");
  if (error || !data?.length) voltarFicha(atletaId, "erro", "Não foi possível excluir o registro.");

  revalidatePath(`/atletas/${atletaId}`); revalidatePath("/monitorizacao"); revalidatePath("/dashboard");
  voltarFicha(atletaId, "aviso", "Registro de bem-estar excluído.");
}

// ---- Testes físicos ----
export async function atualizarResultadoTeste(atletaId: string, resultadoId: string, formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "avaliacoes")) voltarFicha(atletaId, "erro", "Você não tem permissão para editar resultados.");

  const valor = Number(String(formData.get("valor") ?? "").trim().replace(",", "."));
  const data = String(formData.get("data") ?? "").trim();
  if (!Number.isFinite(valor)) voltarFicha(atletaId, "erro", "Informe um resultado numérico.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || data > hojeChave()) voltarFicha(atletaId, "erro", "Escolha uma data que já passou ou hoje.");

  const { data: atualizados, error } = await supabase.from("resultados_teste").update({ valor, medido_em: data }).eq("id", resultadoId).eq("atleta_id", atletaId).select("id");
  if (error || !atualizados?.length) voltarFicha(atletaId, "erro", "Não foi possível salvar as alterações.");

  revalidatePath(`/atletas/${atletaId}`); revalidatePath("/avaliacoes");
  voltarFicha(atletaId, "aviso", `Resultado atualizado: ${String(valor).replace(".", ",")} em ${dataBr(data)}.`);
}

export async function excluirResultadoTeste(atletaId: string, resultadoId: string) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "avaliacoes")) voltarFicha(atletaId, "erro", "Você não tem permissão para excluir resultados.");

  const { data, error } = await supabase.from("resultados_teste").delete().eq("id", resultadoId).eq("atleta_id", atletaId).select("id");
  if (error || !data?.length) voltarFicha(atletaId, "erro", "Não foi possível excluir o resultado.");

  revalidatePath(`/atletas/${atletaId}`); revalidatePath("/avaliacoes");
  voltarFicha(atletaId, "aviso", "Resultado de teste excluído.");
}

// ---- Dados do atleta ----
export async function atualizarAtleta(atletaId: string, formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  if (!["gestor", "comissao_tecnica"].includes(perfil.papel)) voltarFicha(atletaId, "erro", "Você não tem permissão para editar atletas.");

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) voltarFicha(atletaId, "erro", "Informe o nome do atleta.");
  const anoTxt = String(formData.get("ano") ?? "").trim();
  const ano = anoTxt ? Number(anoTxt) : null;
  if (ano !== null && (!Number.isInteger(ano) || ano < 1950 || ano > Number(hojeChave().slice(0, 4)))) voltarFicha(atletaId, "erro", "Ano de nascimento inválido.");

  const { data, error } = await supabase.from("usuarios").update({
    nome, posicao: String(formData.get("posicao") ?? "").trim() || null, ano_nascimento: ano, ativo: formData.get("ativo") === "on",
  }).eq("id", atletaId).eq("papel", "atleta").select("id");
  if (error || !data?.length) voltarFicha(atletaId, "erro", "Não foi possível salvar as alterações.");

  revalidatePath(`/atletas/${atletaId}`); revalidatePath("/equipas"); revalidatePath("/monitorizacao"); revalidatePath("/dashboard");
  voltarFicha(atletaId, "aviso", "Dados do atleta atualizados.");
}

// Só o gestor apaga um atleta. Isso remove também todo o histórico dele.
export async function excluirAtleta(atletaId: string) {
  const { supabase, perfil } = await obterPerfil();
  if (perfil.papel !== "gestor") voltarFicha(atletaId, "erro", "Só o gestor pode excluir atletas.");

  // A função do banco apaga o atleta, o histórico dele e o login, se ele tiver criado conta.
  const { data, error } = await supabase.rpc("excluir_usuario", { p_id: atletaId });
  if (error || !data) voltarFicha(atletaId, "erro", "Não foi possível excluir o atleta.");

  revalidatePath("/equipas"); revalidatePath("/monitorizacao"); revalidatePath("/dashboard");
  redirect("/equipas");
}
