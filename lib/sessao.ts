import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { podeVer } from "@/lib/permissions";
import type { Papel } from "@/types";

export interface Perfil {
  id: string;
  nome: string;
  papel: Papel;
  clube_id: string;
  pode_ver_scout?: boolean;
}

// Devolve o cliente Supabase e o perfil de quem está logado. Sem login, manda para /login.
export async function obterPerfil() {
  const supabase = criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("usuarios").select("*").eq("auth_id", user.id).single();
  if (!data) redirect("/sem-acesso");
  return { supabase, perfil: data as Perfil };
}

export function podeVerScout(perfil: Perfil): boolean {
  if (perfil.papel === "atleta") {
    return Boolean(perfil.pode_ver_scout);
  }
  return podeVer(perfil.papel, "scout");
}
