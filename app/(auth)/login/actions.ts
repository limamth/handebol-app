"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

const erroUrl = (modo: string, msg: string) => redirect(`/login?modo=${modo}&erro=${encodeURIComponent(msg)}`);

// Mensagens do serviço de login (em inglês) traduzidas para o usuário
function traduzirErro(msg: string) {
  const minimo = msg.match(/at least (\d+)/i);
  if (minimo) return `A senha é curta demais: use pelo menos ${minimo[1]} caracteres.`;
  if (/already (been )?registered/i.test(msg)) return "Este e-mail já tem cadastro.";
  if (/database error saving new user/i.test(msg)) return "Não foi possível criar a conta. Confira o código de acesso e tente de novo.";
  return msg;
}

export async function entrar(formData: FormData) {
  const supabase = criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("senha")),
  });
  if (error) erroUrl("entrar", "E-mail ou senha incorretos.");
  redirect("/dashboard");
}

export async function criarClube(formData: FormData) {
  const supabase = criarClienteServidor();
  const { data: pode } = await supabase.rpc("pode_criar_clube");
  if (!pode) erroUrl("entrar", "A criação de novos clubes está desativada. Use o código de acesso que você recebeu.");
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("senha")),
    // O gatilho do banco lê estes campos e cria o clube + o perfil de gestor.
    options: { data: { nome: String(formData.get("nome")), clube_nome: String(formData.get("clube")) } },
  });
  if (error) erroUrl("criar", traduzirErro(error.message));
  if (!data.session) erroUrl("entrar", "Conta criada. Confirme o e-mail e entre.");
  redirect("/dashboard");
}

// Atleta cria a conta com o código que a comissão gerou na ficha dele
export async function criarContaComCodigo(formData: FormData) {
  const supabase = criarClienteServidor();
  const codigo = String(formData.get("codigo") ?? "").trim().toUpperCase();

  const { data: valido } = await supabase.rpc("codigo_valido", { p_codigo: codigo });
  if (!valido) erroUrl("codigo", "Código inválido ou já utilizado.");

  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("senha")),
    options: { data: { codigo_convite: codigo } },
  });
  if (error) erroUrl("codigo", traduzirErro(error.message));
  if (!data.session) erroUrl("entrar", "Conta criada. Confirme o e-mail e entre.");
  redirect("/dashboard");
}

export async function sair() {
  await criarClienteServidor().auth.signOut();
  redirect("/login");
}
