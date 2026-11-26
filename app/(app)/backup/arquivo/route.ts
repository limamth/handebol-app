import { NextResponse } from "next/server";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import { hojeChave } from "@/lib/periodo";
import { gerarBackup } from "@/lib/backup";

// Só o gestor baixa o backup. O arquivo tem dados de saúde dos atletas: não é guardado em nenhum lugar do app.
export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "backup")) return new NextResponse("Sem permissão.", { status: 403 });

  try {
    const { conteudo, total } = await gerarBackup(supabase);
    await supabase.from("registro_backup").insert({ clube_id: perfil.clube_id, feito_por: perfil.id, linhas: total });
    return new NextResponse(conteudo, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="backup-bh-hub-${hojeChave()}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[backup] erro ao gerar:", err);
    return new NextResponse("Não foi possível gerar o backup. Tente de novo.", { status: 500 });
  }
}
