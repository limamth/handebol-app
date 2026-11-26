"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import {
  calcularPlacaresPorSet,
  pontosDoArremesso,
  type AcaoPartida,
  type ResultadoAcao,
} from "@/lib/analise-jogo";

export async function criarPartidaAnalise(formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "analise_jogo")) {
    redirect("/analise-jogo?erro=" + encodeURIComponent("Sem permissão para criar análises ao vivo."));
  }

  const equipeAId = String(formData.get("equipe_a_id") ?? "").trim() || null;
  let equipeANome = String(formData.get("equipe_a_nome") ?? "").trim();
  const equipeBId = String(formData.get("equipe_b_id") ?? "").trim() || null;
  let equipeBNome = String(formData.get("equipe_b_nome") ?? "").trim();
  const competicao = String(formData.get("competicao") ?? "").trim() || null;
  const fase = String(formData.get("fase") ?? "").trim() || null;
  const dataPartida = String(formData.get("data_partida") ?? "").trim() || new Date().toISOString().slice(0, 10);

  if (equipeAId && !equipeANome) {
    const { data: eqA } = await supabase
      .from("equipes_analise")
      .select("nome")
      .eq("id", equipeAId)
      .single();
    equipeANome = eqA?.nome ?? "Equipe A";
  }

  if (equipeBId && !equipeBNome) {
    const { data: eqB } = await supabase
      .from("equipes_analise")
      .select("nome")
      .eq("id", equipeBId)
      .single();
    equipeBNome = eqB?.nome ?? "Equipe B";
  }

  if (!equipeANome) equipeANome = "Equipe A";
  if (!equipeBNome) equipeBNome = "Equipe B";

  const { data, error } = await supabase
    .from("partidas_analise")
    .insert({
      clube_id: perfil.clube_id,
      equipa_id: null,
      equipe_a_id: equipeAId,
      equipe_a_nome: equipeANome,
      equipe_b_id: equipeBId,
      equipe_b_nome: equipeBNome,
      adversario_nome: equipeBNome,
      competicao,
      fase,
      data_partida: dataPartida,
      status: "ao_vivo",
      criado_por: perfil.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect("/analise-jogo?erro=" + encodeURIComponent("Não foi possível iniciar a partida: " + (error?.message ?? "")));
  }

  revalidatePath("/analise-jogo");
  redirect(`/analise-jogo/${data.id}`);
}

export interface NovaAcaoPayload {
  setNumero: number;
  lado: "nos" | "adversario";
  resultado: ResultadoAcao;
  atletaId?: string | null;
  atletaAdversarioId?: string | null;
  atletaNome: string;
  tipo: string;
  atletaAlvoId?: string | null;
  atletaAlvoNome?: string | null;
  zona?: string | null;
  quadranteBaliza?: string | null;
  faixaTempo: string;
}

const MAPA_ZONA_SCOUT: Record<string, string> = {
  lat_esq: "lateral_esq",
  meio_esq: "meio_esq",
  meio_dir: "meio_dir",
  lat_dir: "lateral_dir",
};

const TIPOS_SCOUT_JOGO = new Set(["giro", "aerea", "especialista", "1pt", "6m"]);

async function recalcularESalvarPlacar(supabase: any, partidaId: string, clubeId: string) {
  const { data: todasAcoes } = await supabase
    .from("acoes_partida")
    .select("*")
    .eq("partida_id", partidaId)
    .eq("clube_id", clubeId)
    .order("criado_em", { ascending: true });

  const placares = calcularPlacaresPorSet((todasAcoes ?? []) as AcaoPartida[]);
  await supabase
    .from("partidas_analise")
    .update(placares)
    .eq("id", partidaId)
    .eq("clube_id", clubeId);

  return { placares, acoes: (todasAcoes ?? []) as AcaoPartida[] };
}

export async function registrarAcaoPartida(partidaId: string, payload: NovaAcaoPayload) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "analise_jogo")) {
    throw new Error("Você não tem permissão para registrar ações.");
  }

  const pontos = payload.resultado === "gol" ? pontosDoArremesso(payload.tipo) : 0;

  // Busca placar atual do set para gravar o placar no momento do lance
  const { data: partida } = await supabase
    .from("partidas_analise")
    .select("set1_nos, set1_adv, set2_nos, set2_adv, shootout_nos, shootout_adv, equipe_a_id, equipe_b_id, equipe_a_nome, equipe_b_nome, equipe_adversaria_id, adversario_nome")
    .eq("id", partidaId)
    .eq("clube_id", perfil.clube_id)
    .single();

  if (!partida) throw new Error("Partida não encontrada.");

  let placarNos = 0;
  let placarAdv = 0;
  if (payload.setNumero === 1) {
    placarNos = partida.set1_nos + (payload.lado === "nos" ? pontos : 0);
    placarAdv = partida.set1_adv + (payload.lado === "adversario" ? pontos : 0);
  } else if (payload.setNumero === 2) {
    placarNos = partida.set2_nos + (payload.lado === "nos" ? pontos : 0);
    placarAdv = partida.set2_adv + (payload.lado === "adversario" ? pontos : 0);
  } else {
    placarNos = partida.shootout_nos + (payload.lado === "nos" ? pontos : 0);
    placarAdv = partida.shootout_adv + (payload.lado === "adversario" ? pontos : 0);
  }

  // Se for arremesso (gol, fora, defendido), sincroniza automaticamente com o módulo Scout
  let scoutFinalizacaoId: string | null = null;
  if (["gol", "fora", "defendido"].includes(payload.resultado) && TIPOS_SCOUT_JOGO.has(payload.tipo)) {
    try {
      const equipeAnaliseId = payload.lado === "nos" ? partida.equipe_a_id : partida.equipe_b_id;
      const nomeEquipe =
        payload.lado === "nos"
          ? partida.equipe_a_nome || "Equipe A"
          : partida.equipe_b_nome || partida.adversario_nome || "Equipe B";

      let eqAdvId: string | null = payload.lado === "adversario" ? partida.equipe_adversaria_id : null;

      if (equipeAnaliseId) {
        const { data: eqAn } = await supabase
          .from("equipes_analise")
          .select("id, nome, categoria, equipe_adversaria_id")
          .eq("id", equipeAnaliseId)
          .single();

        if (eqAn?.equipe_adversaria_id) {
          eqAdvId = eqAn.equipe_adversaria_id;
        } else if (eqAn) {
          const { data: novaAdv } = await supabase
            .from("equipes_adversarias")
            .insert({ clube_id: perfil.clube_id, nome: eqAn.nome, categoria: eqAn.categoria })
            .select("id")
            .single();
          if (novaAdv?.id) {
            eqAdvId = novaAdv.id;
            await supabase
              .from("equipes_analise")
              .update({ equipe_adversaria_id: novaAdv.id })
              .eq("id", eqAn.id);
          }
        }
      } else if (!eqAdvId) {
        // Partida com nome livre: tenta localizar ou criar em equipes_adversarias pelo nome
        const { data: existente } = await supabase
          .from("equipes_adversarias")
          .select("id")
          .eq("clube_id", perfil.clube_id)
          .eq("nome", nomeEquipe)
          .maybeSingle();
        if (existente?.id) {
          eqAdvId = existente.id;
        } else {
          const { data: novaAdv } = await supabase
            .from("equipes_adversarias")
            .insert({ clube_id: perfil.clube_id, nome: nomeEquipe })
            .select("id")
            .single();
          eqAdvId = novaAdv?.id ?? null;
        }
      }

      if (eqAdvId) {
        // Resolve atleta_adversario_id pelo nome/número
        const nomeLimpo = payload.atletaNome.replace(/^#\d+\s*/, "").trim();
        const numMatch = payload.atletaNome.match(/^#(\d+)\s*/);
        const num = numMatch ? Number(numMatch[1]) : null;

        let atletaAdvId: string | null = null;
        const { data: atlExist } = await supabase
          .from("atletas_adversarios")
          .select("id")
          .eq("equipe_adversaria_id", eqAdvId)
          .eq("nome", nomeLimpo)
          .maybeSingle();

        if (atlExist?.id) {
          atletaAdvId = atlExist.id;
        } else {
          const { data: novoAtl } = await supabase
            .from("atletas_adversarios")
            .insert({
              clube_id: perfil.clube_id,
              equipe_adversaria_id: eqAdvId,
              nome: nomeLimpo,
              numero: num,
            })
            .select("id")
            .single();
          atletaAdvId = novoAtl?.id ?? null;
        }

        const zonaCampo =
          payload.tipo === "6m" ? null : payload.zona ? MAPA_ZONA_SCOUT[payload.zona] ?? null : null;
        const desfechoDetalhe =
          payload.resultado === "gol"
            ? "gol"
            : payload.resultado === "defendido"
            ? "defesa"
            : payload.quadranteBaliza === "trave"
            ? "trave"
            : "fora";

        const { data: scIns } = await supabase
          .from("scout_finalizacoes_adversario")
          .insert({
            clube_id: perfil.clube_id,
            equipe_adversaria_id: eqAdvId,
            atleta_adversario_id: atletaAdvId,
            origem: "jogo",
            tipo_finalizacao: payload.tipo,
            zona_campo: zonaCampo,
            quadrante_baliza: payload.quadranteBaliza || null,
            resultado: payload.resultado === "gol" ? "convertido" : "perdido",
            desfecho_detalhe: desfechoDetalhe,
            observacao: "Análise ao Vivo",
          })
          .select("id")
          .single();

        scoutFinalizacaoId = scIns?.id ?? null;
      }
    } catch (e) {
      console.warn("Aviso ao sincronizar lance com Scout:", e);
    }
  }

  const { data: inserida, error } = await supabase
    .from("acoes_partida")
    .insert({
      clube_id: perfil.clube_id,
      partida_id: partidaId,
      set_numero: payload.setNumero,
      lado: payload.lado,
      resultado: payload.resultado,
      atleta_id: payload.atletaId || null,
      atleta_adversario_id: payload.atletaAdversarioId || null,
      atleta_nome: payload.atletaNome,
      tipo: payload.tipo,
      pontos,
      atleta_alvo_id: payload.atletaAlvoId || null,
      atleta_alvo_nome: payload.atletaAlvoNome || null,
      zona: payload.zona || null,
      quadrante_baliza: payload.quadranteBaliza || null,
      scout_finalizacao_id: scoutFinalizacaoId,
      faixa_tempo: payload.faixaTempo,
      placar_nos_momento: placarNos,
      placar_adv_momento: placarAdv,
    })
    .select("*")
    .single();

  if (error || !inserida) {
    throw new Error(error?.message ?? "Erro ao registrar ação.");
  }

  const { placares, acoes } = await recalcularESalvarPlacar(supabase, partidaId, perfil.clube_id);

  revalidatePath(`/analise-jogo/${partidaId}`);
  revalidatePath(`/analise-jogo/${partidaId}/estatisticas`);
  revalidatePath("/analise-jogo");
  revalidatePath("/scout");

  return { acao: inserida as AcaoPartida, placares, acoes };
}

export async function excluirAcaoPartida(partidaId: string, acaoId: string) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "analise_jogo")) {
    throw new Error("Sem permissão para excluir ações.");
  }

  const { data: removida, error } = await supabase
    .from("acoes_partida")
    .delete()
    .eq("id", acaoId)
    .eq("partida_id", partidaId)
    .eq("clube_id", perfil.clube_id)
    .select("scout_finalizacao_id")
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (removida?.scout_finalizacao_id) {
    await supabase
      .from("scout_finalizacoes_adversario")
      .delete()
      .eq("id", removida.scout_finalizacao_id)
      .eq("clube_id", perfil.clube_id);
  }

  const { placares, acoes } = await recalcularESalvarPlacar(supabase, partidaId, perfil.clube_id);

  revalidatePath(`/analise-jogo/${partidaId}`);
  revalidatePath(`/analise-jogo/${partidaId}/estatisticas`);
  revalidatePath("/analise-jogo");
  revalidatePath("/scout");

  return { placares, acoes };
}

export async function finalizarPartidaAnalise(partidaId: string) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "analise_jogo")) {
    redirect(`/analise-jogo/${partidaId}?erro=` + encodeURIComponent("Sem permissão."));
  }

  await supabase
    .from("partidas_analise")
    .update({ status: "finalizada" })
    .eq("id", partidaId)
    .eq("clube_id", perfil.clube_id);

  revalidatePath("/analise-jogo");
  revalidatePath(`/analise-jogo/${partidaId}`);
  revalidatePath(`/analise-jogo/${partidaId}/estatisticas`);
  redirect(`/analise-jogo/${partidaId}/estatisticas?aviso=` + encodeURIComponent("Partida finalizada com sucesso!"));
}

export async function reabrirPartidaAnalise(partidaId: string) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "analise_jogo")) {
    redirect(`/analise-jogo/${partidaId}/estatisticas?erro=` + encodeURIComponent("Sem permissão."));
  }

  await supabase
    .from("partidas_analise")
    .update({ status: "ao_vivo" })
    .eq("id", partidaId)
    .eq("clube_id", perfil.clube_id);

  revalidatePath("/analise-jogo");
  revalidatePath(`/analise-jogo/${partidaId}`);
  redirect(`/analise-jogo/${partidaId}`);
}

export async function excluirPartidaAnalise(partidaId: string) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "analise_jogo")) {
    redirect("/analise-jogo?erro=" + encodeURIComponent("Sem permissão."));
  }

  await supabase
    .from("partidas_analise")
    .delete()
    .eq("id", partidaId)
    .eq("clube_id", perfil.clube_id);

  revalidatePath("/analise-jogo");
  redirect("/analise-jogo?aviso=" + encodeURIComponent("Partida excluída."));
}
