import { NextResponse } from "next/server";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import { enviarLembreteBemEstar } from "@/lib/notificacoes";

export async function POST() {
  try {
    const { supabase, perfil } = await obterPerfil();
    if (!perfil) {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    if (!podeEditar(perfil.papel, "monitorizacao") && !podeEditar(perfil.papel, "configuracoes")) {
      return NextResponse.json({ erro: "Permissão insuficiente para disparar notificações." }, { status: 403 });
    }

    const resultado = await enviarLembreteBemEstar(supabase, perfil.clube_id);
    return NextResponse.json(resultado);
  } catch (err: any) {
    return NextResponse.json({ erro: err?.message || "Erro ao disparar lembretes." }, { status: 500 });
  }
}
