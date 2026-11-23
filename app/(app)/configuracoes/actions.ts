"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import { MODULOS_CONFIGURAVEIS } from "@/lib/configuracoes";

export async function alterarModulo(chave: string, ativar: boolean) {
  const { supabase, perfil } = await obterPerfil();
  const volta = (tipo: "aviso" | "erro", m: string) => redirect(`/configuracoes?${tipo}=${encodeURIComponent(m)}`);
  if (!podeEditar(perfil.papel, "configuracoes")) volta("erro", "Você não tem permissão para alterar as configurações.");

  const modulo = MODULOS_CONFIGURAVEIS.find((m) => m.chave === chave);
  if (!modulo) volta("erro", "Função desconhecida.");

  const { error } = await supabase.from("configuracoes_modulos").upsert(
    { clube_id: perfil.clube_id, modulo: chave, ativo: ativar, atualizado_por: perfil.id, atualizado_em: new Date().toISOString() },
    { onConflict: "clube_id,modulo" },
  );
  if (error) volta("erro", "Não foi possível salvar. Tente de novo.");

  revalidatePath("/", "layout");
  volta("aviso", `${modulo!.rotulo}: ${ativar ? "função ativada" : "função desativada"}.`);
}
