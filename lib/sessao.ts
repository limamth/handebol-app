import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Papel } from "@/types";

export interface Perfil { id: string; nome: string; papel: Papel; clube_id: string; }

// Devolve o cliente Supabase e o perfil de quem está logado. Sem login, manda para /login.
export async function obterPerfil() {
  const supabase = criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("usuarios").select("id, nome, papel, clube_id").eq("auth_id", user.id).single();
  if (!data) redirect("/sem-acesso");
  return { supabase, perfil: data as Perfil };
}
