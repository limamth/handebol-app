"use server";

import { revalidatePath } from "next/cache";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";

export async function salvarAtletasComAcessoScout(atletasIds: string[]) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "scout")) {
    throw new Error("Sem permissão para alterar o acesso ao Scout.");
  }

  const { error } = await supabase.rpc("definir_acesso_scout_atletas", {
    p_atletas_ids: atletasIds,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/scout");
  revalidatePath("/", "layout");
  return { ok: true };
}
