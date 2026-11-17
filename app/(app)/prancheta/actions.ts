"use server";

import { revalidatePath } from "next/cache";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import type { DadosTaticos } from "@/lib/prancheta";

export type ResultadoSalvar = { ok: true; id: string } | { ok: false; erro: string };

export async function salvarDiagrama(id: string | null, titulo: string, dados: DadosTaticos): Promise<ResultadoSalvar> {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "prancheta")) return { ok: false, erro: "Você não tem permissão para editar a prancheta." };

  const nome = titulo.trim();
  if (!nome) return { ok: false, erro: "Dê um nome à jogada." };
  if (!Array.isArray(dados?.frames) || dados.frames.length === 0 || dados.frames.length > 60) return { ok: false, erro: "A jogada precisa ter entre 1 e 60 quadros." };

  const consulta = id
    ? supabase.from("diagramas").update({ titulo: nome, dados }).eq("id", id)
    : supabase.from("diagramas").insert({ clube_id: perfil.clube_id, autor_id: perfil.id, titulo: nome, dados });
  const { data, error } = await consulta.select("id").single();
  if (error || !data) return { ok: false, erro: "Não foi possível salvar a jogada." };

  revalidatePath("/prancheta");
  return { ok: true, id: data.id };
}
