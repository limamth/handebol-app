import type { SupabaseClient } from "@supabase/supabase-js";
import { hojeChave } from "@/lib/periodo";
import { enviarNotificacaoPush } from "@/lib/webpush";

export interface ConfiguracaoLembretes {
  clubeId: string;
  horarioLembrete: string; // "HH:MM:SS" ou "HH:MM"
  ativo: boolean;
  ultimoDisparo?: string | null; // "YYYY-MM-DD"
}

export interface AtletaPendenteNotificacao {
  atletaId: string;
  nome: string;
  email?: string;
  faseNome: string;
  faseId: string;
  temInscricaoPush: boolean;
}

export interface ResultadoVerificacaoPendencias {
  faseAtiva: { id: string; nome: string; inicio: string; fim: string } | null;
  totalConvocados: number;
  totalRespondidos: number;
  pendentes: AtletaPendenteNotificacao[];
}

export interface ResultadoEnvioLembretes {
  sucesso: boolean;
  mensagem: string;
  enviados: number;
  falhas: number;
  totalPendentes: number;
  nomesNotificados: string[];
}

/**
 * Carrega a configuração do horário de lembrete diário do clube.
 * Padrão: 09:00:00, ativo: true.
 */
export async function carregarConfiguracaoLembretes(
  supabase: SupabaseClient,
  clubeId: string
): Promise<ConfiguracaoLembretes> {
  const { data } = await supabase
    .from("configuracao_lembretes")
    .select("clube_id, horario_lembrete, ativo, ultimo_disparo")
    .eq("clube_id", clubeId)
    .maybeSingle();

  if (!data) {
    return {
      clubeId,
      horarioLembrete: "09:00",
      ativo: true,
      ultimoDisparo: null,
    };
  }

  // Normaliza HH:MM
  const horario = data.horario_lembrete?.slice(0, 5) || "09:00";

  return {
    clubeId,
    horarioLembrete: horario,
    ativo: data.ativo ?? true,
    ultimoDisparo: data.ultimo_disparo,
  };
}

/**
 * Salva ou atualiza a configuração do horário de lembrete do clube.
 */
export async function salvarConfiguracaoLembretes(
  supabase: SupabaseClient,
  clubeId: string,
  dados: { horarioLembrete: string; ativo: boolean }
) {
  const horarioLimpo = dados.horarioLembrete.length === 5 ? `${dados.horarioLembrete}:00` : dados.horarioLembrete;

  const { error } = await supabase.from("configuracao_lembretes").upsert(
    {
      clube_id: clubeId,
      horario_lembrete: horarioLimpo,
      ativo: dados.ativo,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "clube_id" }
  );

  if (error) throw new Error("Não foi possível salvar a configuração de lembretes: " + error.message);
}

/**
 * Busca os atletas que estão convocados para uma fase ativa HOJE
 * e que AINDA NÃO responderam o questionário de bem-estar.
 *
 * Regra estrita: só precisam responder atletas convocados para fases ativas.
 */
export async function buscarAtletasPendentesBemEstar(
  supabase: SupabaseClient,
  clubeId: string,
  dia: string = hojeChave()
): Promise<ResultadoVerificacaoPendencias> {
  // 1. Busca fases de treinamento ativas hoje para o clube
  const { data: fases } = await supabase
    .from("fases_treinamento")
    .select("id, nome, inicio, fim")
    .eq("clube_id", clubeId)
    .lte("inicio", dia)
    .gte("fim", dia);

  if (!fases || fases.length === 0) {
    return {
      faseAtiva: null,
      totalConvocados: 0,
      totalRespondidos: 0,
      pendentes: [],
    };
  }

  const faseIds = fases.map((f) => f.id);
  const fasePrincipal = fases[0];

  // 2. Busca atletas convocados para essas fases ativas
  const { data: convocadosData } = await supabase
    .from("fase_convocados")
    .select(`
      fase_id,
      atleta_id,
      usuarios!inner (id, nome, email, ativo, clube_id, papel)
    `)
    .in("fase_id", faseIds);

  const convocadosAtivos = ((convocadosData ?? []) as any[]).filter(
    (c) => c.usuarios?.ativo && c.usuarios?.clube_id === clubeId && c.usuarios?.papel === "atleta"
  );

  if (convocadosAtivos.length === 0) {
    return {
      faseAtiva: fasePrincipal,
      totalConvocados: 0,
      totalRespondidos: 0,
      pendentes: [],
    };
  }

  const atletaIds = [...new Set(convocadosAtivos.map((c) => c.atleta_id as string))];

  // 3. Busca o ID do questionário de bem-estar diário
  const { data: quest } = await supabase
    .from("questionarios")
    .select("id")
    .eq("clube_id", clubeId)
    .eq("nome", "Bem-estar diário")
    .maybeSingle();

  // 4. Busca quem já respondeu hoje
  let respondidosSet = new Set<string>();
  if (quest?.id && atletaIds.length > 0) {
    const { data: respostas } = await supabase
      .from("respostas_questionario")
      .select("atleta_id")
      .eq("questionario_id", quest.id)
      .eq("dia", dia)
      .in("atleta_id", atletaIds);

    respondidosSet = new Set((respostas ?? []).map((r) => r.atleta_id as string));
  }

  // 5. Verifica quais atletas têm subscrição push cadastrada
  const { data: subsData } = await supabase
    .from("push_subscriptions")
    .select("usuario_id")
    .in("usuario_id", atletaIds);

  const comPushSet = new Set((subsData ?? []).map((s) => s.usuario_id as string));

  // 6. Separa a lista dos pendentes
  const pendentes: AtletaPendenteNotificacao[] = [];
  const jaAdicionado = new Set<string>();

  for (const c of convocadosAtivos) {
    const id = c.atleta_id;
    if (jaAdicionado.has(id)) continue;
    jaAdicionado.add(id);

    if (!respondidosSet.has(id)) {
      const faseCorrespondente = fases.find((f) => f.id === c.fase_id) || fasePrincipal;
      pendentes.push({
        atletaId: id,
        nome: c.usuarios?.nome || "Atleta",
        email: c.usuarios?.email || undefined,
        faseNome: faseCorrespondente.nome,
        faseId: faseCorrespondente.id,
        temInscricaoPush: comPushSet.has(id),
      });
    }
  }

  return {
    faseAtiva: fasePrincipal,
    totalConvocados: atletaIds.length,
    totalRespondidos: respondidosSet.size,
    pendentes,
  };
}

/**
 * Executa o envio dos lembretes de bem-estar para os atletas pendentes.
 */
export async function enviarLembreteBemEstar(
  supabase: SupabaseClient,
  clubeId: string,
  dia: string = hojeChave()
): Promise<ResultadoEnvioLembretes> {
  const { faseAtiva, pendentes } = await buscarAtletasPendentesBemEstar(supabase, clubeId, dia);

  if (!faseAtiva) {
    return {
      sucesso: true,
      mensagem: "Não há nenhuma fase de treinamento ativa hoje. Nenhum atleta precisa responder.",
      enviados: 0,
      falhas: 0,
      totalPendentes: 0,
      nomesNotificados: [],
    };
  }

  if (pendentes.length === 0) {
    return {
      sucesso: true,
      mensagem: "Excelente! Todos os atletas convocados já responderam o questionário de hoje.",
      enviados: 0,
      falhas: 0,
      totalPendentes: 0,
      nomesNotificados: [],
    };
  }

  const pendentesIds = pendentes.map((p) => p.atletaId);

  // Busca as subscrições push dos atletas pendentes
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("usuario_id, endpoint, p256dh, auth")
    .in("usuario_id", pendentesIds);

  let enviados = 0;
  let falhas = 0;
  const nomesNotificados: string[] = [];
  const endpointsInvalidos: string[] = [];

  const agoraHora = new Date().toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour12: false,
  });

  const subsPorAtleta = new Map<string, any[]>();
  (subs ?? []).forEach((s) => {
    if (!subsPorAtleta.has(s.usuario_id)) subsPorAtleta.set(s.usuario_id, []);
    subsPorAtleta.get(s.usuario_id)!.push(s);
  });

  for (const atleta of pendentes) {
    const inscricoes = subsPorAtleta.get(atleta.atletaId) ?? [];

    if (inscricoes.length === 0) {
      // Registra no histórico que o atleta estava pendente mas sem push no aparelho
      await supabase.from("notificacoes_historico").insert({
        clube_id: clubeId,
        atleta_id: atleta.atletaId,
        fase_id: atleta.faseId,
        tipo: "bem_estar",
        dia,
        horario: agoraHora,
        status: "sem_subscricao",
        detalhes: "Atleta não possui aparelho com notificações push ativadas.",
      });
      continue;
    }

    let teveSucesso = false;

    for (const sub of inscricoes) {
      const res = await enviarNotificacaoPush(
        {
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
        {
          title: "📋 Lembrete: Meu Bem-Estar",
          body: `Olá, ${atleta.nome.split(" ")[0]}! Você está na fase "${atleta.faseNome}". Não se esqueça de registrar seu bem-estar de hoje!`,
          url: "/meu-bem-estar",
          tag: `bem-estar-${dia}`,
        }
      );

      if (res.ok) {
        teveSucesso = true;
      } else {
        if (res.status === 404 || res.status === 410) {
          endpointsInvalidos.push(sub.endpoint);
        }
      }
    }

    if (teveSucesso) {
      enviados += 1;
      nomesNotificados.push(atleta.nome);
      await supabase.from("notificacoes_historico").insert({
        clube_id: clubeId,
        atleta_id: atleta.atletaId,
        fase_id: atleta.faseId,
        tipo: "bem_estar",
        dia,
        horario: agoraHora,
        status: "enviado",
        detalhes: "Notificação push entregue com sucesso.",
      });
    } else {
      falhas += 1;
      await supabase.from("notificacoes_historico").insert({
        clube_id: clubeId,
        atleta_id: atleta.atletaId,
        fase_id: atleta.faseId,
        tipo: "bem_estar",
        dia,
        horario: agoraHora,
        status: "erro",
        detalhes: "Falha ao enviar push para o dispositivo.",
      });
    }
  }

  // Limpa endpoints expirados (410 Gone / 404)
  if (endpointsInvalidos.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", endpointsInvalidos);
  }

  // Registra a data do último disparo efetuado
  await supabase
    .from("configuracao_lembretes")
    .update({ ultimo_disparo: dia, atualizado_em: new Date().toISOString() })
    .eq("clube_id", clubeId);

  return {
    sucesso: true,
    mensagem: `Lembrete processado para ${pendentes.length} atleta(s) pendente(s). ${enviados} notificação(ões) enviada(s).`,
    enviados,
    falhas,
    totalPendentes: pendentes.length,
    nomesNotificados,
  };
}

/**
 * Salva uma nova subscrição Push para o usuário atual.
 */
export async function salvarSubscricaoPush(
  supabase: SupabaseClient,
  usuarioId: string,
  subscricao: { endpoint: string; p256dh: string; auth: string }
) {
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      usuario_id: usuarioId,
      endpoint: subscricao.endpoint,
      p256dh: subscricao.p256dh,
      auth: subscricao.auth,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "usuario_id,endpoint" }
  );

  if (error) throw new Error("Erro ao salvar subscrição push: " + error.message);
}

/**
 * Remove uma subscrição Push quando o usuário desativa no navegador.
 */
export async function removerSubscricaoPush(
  supabase: SupabaseClient,
  usuarioId: string,
  endpoint: string
) {
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("usuario_id", usuarioId)
    .eq("endpoint", endpoint);
}
