import { NextResponse } from "next/server";
import { obterPerfil } from "@/lib/sessao";
import { salvarSubscricaoPush, removerSubscricaoPush } from "@/lib/notificacoes";

export async function POST(req: Request) {
  try {
    const { supabase, perfil } = await obterPerfil();
    if (!perfil) {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    const corpo = await req.json();
    const { endpoint, keys } = corpo;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ erro: "Dados de subscrição push inválidos." }, { status: 400 });
    }

    await salvarSubscricaoPush(supabase, perfil.id, {
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });

    return NextResponse.json({ ok: true, mensagem: "Subscrição push registrada com sucesso." });
  } catch (err: any) {
    return NextResponse.json({ erro: err?.message || "Erro ao registrar subscrição push." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { supabase, perfil } = await obterPerfil();
    if (!perfil) {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    const corpo = await req.json();
    const { endpoint } = corpo;

    if (endpoint) {
      await removerSubscricaoPush(supabase, perfil.id, endpoint);
    }

    return NextResponse.json({ ok: true, mensagem: "Subscrição removida." });
  } catch (err: any) {
    return NextResponse.json({ erro: err?.message || "Erro ao remover subscrição push." }, { status: 500 });
  }
}
