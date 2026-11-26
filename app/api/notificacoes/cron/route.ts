import { NextResponse } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeChave } from "@/lib/periodo";
import { enviarLembreteBemEstar } from "@/lib/notificacoes";

export async function GET(req: Request) {
  return processarCronLembretes();
}

export async function POST(req: Request) {
  return processarCronLembretes();
}

async function processarCronLembretes() {
  try {
    const supabase = criarClienteServidor();
    const hoje = hojeChave();

    // Horário atual no fuso de Brasília (HH:MM:SS)
    const agoraSp = new Date().toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour12: false,
    });

    // Busca configurações de clubes com lembretes ativos
    const { data: configs, error } = await supabase
      .from("configuracao_lembretes")
      .select("clube_id, horario_lembrete, ativo, ultimo_disparo")
      .eq("ativo", true);

    if (error || !configs) {
      return NextResponse.json({
        ok: true,
        mensagem: "Nenhum clube configurado ou tabela ainda não inicializada.",
        horaAtual: agoraSp,
      });
    }

    const relatorio: any[] = [];

    for (const conf of configs) {
      const horarioConfig = conf.horario_lembrete?.slice(0, 5) || "09:00";
      const jaDisparouHoje = conf.ultimo_disparo === hoje;

      // Se a hora atual já passou do horário fixo e ainda não disparou hoje
      if (agoraSp >= horarioConfig && !jaDisparouHoje) {
        const res = await enviarLembreteBemEstar(supabase, conf.clube_id, hoje);
        relatorio.push({
          clubeId: conf.clube_id,
          horarioConfig,
          disparado: true,
          resultado: res,
        });
      } else {
        relatorio.push({
          clubeId: conf.clube_id,
          horarioConfig,
          disparado: false,
          motivo: jaDisparouHoje ? "Já disparado hoje." : `Aguardando horário fixo (${horarioConfig}).`,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      horaAtual: agoraSp,
      hoje,
      clubesProcessados: relatorio.length,
      relatorio,
    });
  } catch (err: any) {
    return NextResponse.json({ erro: err?.message || "Erro no cron de lembretes" }, { status: 500 });
  }
}
