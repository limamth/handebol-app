"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterPerfil } from "@/lib/sessao";
import { PAPEIS_CADASTRAVEIS, ROTULO_PAPEL } from "@/lib/papeis";
import type { Papel } from "@/types";

// Alfabeto sem letras e números parecidos (0/O, 1/I). 32 símbolos dividem 256 sem viés.
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const gerarCodigo = () => Array.from(randomBytes(8), (b) => ALFABETO[b % 32]).join("");

const voltar = (aba: string, tipo: "aviso" | "erro", msg: string) => redirect(`/utilizadores?aba=${aba}&${tipo}=${encodeURIComponent(msg)}`);
const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function criarMembro(formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  if (perfil.papel !== "gestor") voltar("comissao", "erro", "Só o gestor cadastra a comissão técnica.");

  const nome = texto(formData, "nome");
  const papel = texto(formData, "papel") as Papel;
  if (!nome || !PAPEIS_CADASTRAVEIS.includes(papel)) voltar("comissao", "erro", "Informe o nome e escolha um perfil válido.");

  const { data, error } = await supabase.from("usuarios").insert({ clube_id: perfil.clube_id, nome, papel }).select("id").single();
  if (error || !data) voltar("comissao", "erro", "Não foi possível cadastrar o membro.");

  const codigo = gerarCodigo();
  const { error: erroCodigo } = await supabase.from("convites").upsert({ usuario_id: data!.id, codigo }, { onConflict: "usuario_id" });
  revalidatePath("/utilizadores");
  if (erroCodigo) voltar("comissao", "erro", "Membro cadastrado, mas o código não foi gerado. Gere-o na lista.");
  voltar("comissao", "aviso", `${nome} cadastrado como ${ROTULO_PAPEL[papel]}. Código de acesso: ${codigo}`);
}

export async function atualizarMembro(membroId: string, formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  if (perfil.papel !== "gestor") voltar("comissao", "erro", "Só o gestor altera a comissão técnica.");
  if (membroId === perfil.id) voltar("comissao", "erro", "Você não pode alterar o seu próprio perfil, para não perder o acesso.");

  const nome = texto(formData, "nome");
  const papel = texto(formData, "papel") as Papel;
  if (!nome || !PAPEIS_CADASTRAVEIS.includes(papel)) voltar("comissao", "erro", "Informe o nome e escolha um perfil válido.");

  const { data, error } = await supabase.from("usuarios")
    .update({ nome, papel, ativo: formData.get("ativo") === "on" })
    .eq("id", membroId).neq("papel", "atleta").select("id");
  if (error || !data?.length) voltar("comissao", "erro", "Não foi possível salvar as alterações.");

  revalidatePath("/utilizadores");
  voltar("comissao", "aviso", "Dados do membro atualizados.");
}

export async function gerarCodigoMembro(membroId: string) {
  const { supabase, perfil } = await obterPerfil();
  if (perfil.papel !== "gestor") voltar("comissao", "erro", "Só o gestor gera códigos para a comissão técnica.");

  const codigo = gerarCodigo();
  const { error } = await supabase.from("convites").upsert({ usuario_id: membroId, codigo }, { onConflict: "usuario_id" });
  if (error) voltar("comissao", "erro", "Não foi possível gerar o código.");

  revalidatePath("/utilizadores");
  voltar("comissao", "aviso", `Código de acesso gerado: ${codigo}`);
}

// Gera código para todos os atletas ativos que ainda não têm conta nem código
export async function gerarCodigosPendentes() {
  const { supabase, perfil } = await obterPerfil();
  if (!["gestor", "comissao_tecnica"].includes(perfil.papel)) voltar("atletas", "erro", "Você não tem permissão para gerar códigos.");

  const [{ data: pendentes }, { data: existentes }] = await Promise.all([
    supabase.from("usuarios").select("id").eq("papel", "atleta").eq("ativo", true).is("auth_id", null),
    supabase.from("convites").select("usuario_id"),
  ]);
  const tem = new Set((existentes ?? []).map((c) => c.usuario_id));
  const faltam = (pendentes ?? []).filter((a) => !tem.has(a.id));
  if (!faltam.length) voltar("atletas", "aviso", "Todos os atletas sem conta já têm um código.");

  const { error } = await supabase.from("convites").insert(faltam.map((a) => ({ usuario_id: a.id, codigo: gerarCodigo() })));
  if (error) voltar("atletas", "erro", "Não foi possível gerar os códigos. Tente de novo.");

  revalidatePath("/utilizadores");
  voltar("atletas", "aviso", `${faltam.length} código${faltam.length > 1 ? "s" : ""} gerado${faltam.length > 1 ? "s" : ""}.`);
}

// Só o gestor exclui. A função do banco apaga o perfil, o histórico e o login da pessoa.
export async function excluirUsuario(usuarioId: string, aba: "comissao" | "atletas") {
  const { supabase, perfil } = await obterPerfil();
  if (perfil.papel !== "gestor") voltar(aba, "erro", "Só o gestor pode excluir usuários.");
  if (usuarioId === perfil.id) voltar(aba, "erro", "Você não pode excluir a própria conta.");

  const { data: alvo } = await supabase.from("usuarios").select("nome").eq("id", usuarioId).single();
  const { data, error } = await supabase.rpc("excluir_usuario", { p_id: usuarioId });
  if (error || !data) voltar(aba, "erro", "Não foi possível excluir o usuário.");

  revalidatePath("/utilizadores"); revalidatePath("/equipas"); revalidatePath("/monitorizacao"); revalidatePath("/dashboard");
  voltar(aba, "aviso", `${alvo?.nome ?? "Usuário"} excluído.`);
}

// Esqueceu a senha: apaga o login antigo e gera um código novo (o cadastro e o histórico continuam)
export async function redefinirAcesso(usuarioId: string, aba: "comissao" | "atletas") {
  const { supabase, perfil } = await obterPerfil();
  if (perfil.papel !== "gestor") voltar(aba, "erro", "Só o gestor pode redefinir acessos.");
  if (usuarioId === perfil.id) voltar(aba, "erro", "Você não pode redefinir o próprio acesso.");

  const { data: alvo } = await supabase.from("usuarios").select("nome").eq("id", usuarioId).single();
  const { data: codigo, error } = await supabase.rpc("redefinir_acesso", { p_id: usuarioId });
  if (error || !codigo) voltar(aba, "erro", "Não foi possível redefinir o acesso.");

  revalidatePath("/utilizadores");
  voltar(aba, "aviso", `Acesso de ${alvo?.nome ?? "usuário"} redefinido. Novo código: ${codigo}`);
}
