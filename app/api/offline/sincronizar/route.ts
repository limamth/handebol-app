import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { podeEditar } from "@/lib/permissions";
import { hojeChave } from "@/lib/periodo";
import { PERGUNTAS_BEM_ESTAR } from "@/lib/monitorizacao";
import type { ItemFilaOffline, DadosBemEstarOffline, DadosPresencasOffline } from "@/lib/offline";

export async function POST(request: NextRequest) {
  try {
    const supabase = criarClienteServidor();
    const { data: { user }, error: erroAuth } = await supabase.auth.getUser();
    if (erroAuth || !user) {
      return NextResponse.json({ erro: "Sessão expirada. Faça login novamente." }, { status: 401 });
    }

    const { data: perfil } = await supabase
      .from("usuarios")
      .select("id, nome, papel, clube_id")
      .eq("auth_id", user.id)
      .single();

    if (!perfil) {
      return NextResponse.json({ erro: "Perfil não encontrado ou sem acesso." }, { status: 403 });
    }

    const corpo = await request.json();
    const itens: ItemFilaOffline[] = Array.isArray(corpo.itens) ? corpo.itens : [];

    if (itens.length === 0) {
      return NextResponse.json({ sincronizados: [], erros: [] });
    }

    const sincronizados: string[] = [];
    const erros: { id: string; mensagem: string }[] = [];

    for (const item of itens) {
      try {
        if (item.tipo === "bem_estar") {
          if (perfil.papel !== "atleta") {
            erros.push({ id: item.id, mensagem: "Apenas atletas podem registrar bem-estar." });
            continue;
          }
          const dados = item.dados as DadosBemEstarOffline;
          const dia = dados.dia || hojeChave();
          const hoje = hojeChave();

          if (dia !== hoje) {
            erros.push({ id: item.id, mensagem: `O questionário de bem-estar só é aceito para a data de hoje (${hoje}).` });
            continue;
          }

          const { data: ativas } = await supabase
            .from("fases_treinamento")
            .select("id")
            .lte("inicio", hoje)
            .gte("fim", hoje);
          const idsAtivas = (ativas ?? []).map((f) => f.id);
          if (!idsAtivas.length) {
            erros.push({ id: item.id, mensagem: "Nenhuma fase de treinamento ativa para este dia." });
            continue;
          }

          const { data: convocado } = await supabase
            .from("fase_convocados")
            .select("fase_id")
            .eq("atleta_id", perfil.id)
            .in("fase_id", idsAtivas)
            .limit(1);

          if (!convocado?.length) {
            erros.push({ id: item.id, mensagem: "Você não está na lista de convocados da fase atual." });
            continue;
          }

          const { data: questionarioId } = await supabase.rpc("garantir_questionario");
          if (!questionarioId) {
            erros.push({ id: item.id, mensagem: "Não foi possível carregar o questionário." });
            continue;
          }

          const { data: q } = await supabase
            .from("questionarios")
            .select("perguntas")
            .eq("id", questionarioId)
            .single();

          const chaves = ((q?.perguntas ?? PERGUNTAS_BEM_ESTAR) as { chave: string }[]).map((p) => p.chave);
          const respostas = dados.respostas || {};
          let valido = true;
          for (const chave of chaves) {
            const n = respostas[chave];
            if (!Number.isInteger(n) || n < 1 || n > 5) {
              valido = false;
              break;
            }
          }

          if (!valido) {
            erros.push({ id: item.id, mensagem: "Notas de bem-estar devem ser inteiros de 1 a 5." });
            continue;
          }

          const { error: erroUpsert } = await supabase.from("respostas_questionario").upsert(
            { questionario_id: questionarioId, atleta_id: perfil.id, dia, respostas },
            { onConflict: "questionario_id,atleta_id,dia" }
          );

          if (erroUpsert) {
            erros.push({ id: item.id, mensagem: erroUpsert.message });
          } else {
            sincronizados.push(item.id);
          }
        } else if (item.tipo === "presencas") {
          if (!podeEditar(perfil.papel, "calendario")) {
            erros.push({ id: item.id, mensagem: "Sem permissão para editar presenças." });
            continue;
          }
          const dados = item.dados as DadosPresencasOffline;
          const sessaoId = dados.sessaoId;
          if (!sessaoId) {
            erros.push({ id: item.id, mensagem: "Identificador de sessão ausente." });
            continue;
          }

          if (dados.presencas && dados.presencas.length > 0) {
            const { error: erroUpsert } = await supabase
              .from("presencas")
              .upsert(dados.presencas, { onConflict: "sessao_id,atleta_id" });
            if (erroUpsert) {
              erros.push({ id: item.id, mensagem: erroUpsert.message });
              continue;
            }
          }

          if (dados.limpar && dados.limpar.length > 0) {
            await supabase
              .from("presencas")
              .delete()
              .eq("sessao_id", sessaoId)
              .in("atleta_id", dados.limpar);
          }

          sincronizados.push(item.id);
        } else {
          erros.push({ id: item.id, mensagem: "Tipo de item offline desconhecido." });
        }
      } catch (e: any) {
        erros.push({ id: item.id, mensagem: e.message || "Erro desconhecido ao processar item." });
      }
    }

    return NextResponse.json({
      sucesso: true,
      sincronizados,
      erros,
    });
  } catch (erroGeral: any) {
    return NextResponse.json({ erro: erroGeral.message || "Erro interno no servidor." }, { status: 500 });
  }
}
