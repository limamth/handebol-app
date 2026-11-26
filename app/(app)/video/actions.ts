"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import { extrairYoutubeId, type BotaoTagging, type FormaTelestracao, type PlaylistVideo, type TagVideo } from "@/lib/video-tagging";
import { ROTULO_RESULTADO, ROTULO_TIPO, type AcaoPartida } from "@/lib/analise-jogo";

export async function criarProjetoVideo(formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "video")) {
    redirect("/video?erro=" + encodeURIComponent("Sem permissão para criar projetos de vídeo."));
  }

  const titulo = String(formData.get("titulo") ?? "").trim();
  const tipoFonte = String(formData.get("tipo_fonte") ?? "local") === "youtube" ? "youtube" : "local";
  const urlVideo = String(formData.get("url_video") ?? "").trim() || null;
  const nomeArquivo = String(formData.get("nome_arquivo") ?? "").trim() || null;
  const partidaId = String(formData.get("partida_analise_id") ?? "").trim() || null;

  if (!titulo) {
    redirect("/video?erro=" + encodeURIComponent("Informe um título para a análise."));
  }

  if (tipoFonte === "youtube" && (!urlVideo || !extrairYoutubeId(urlVideo))) {
    redirect("/video?erro=" + encodeURIComponent("Informe um link válido do YouTube."));
  }

  const { data, error } = await supabase
    .from("projetos_video")
    .insert({
      clube_id: perfil.clube_id,
      titulo,
      tipo_fonte: tipoFonte,
      url_video: urlVideo,
      nome_arquivo: nomeArquivo,
      partida_analise_id: partidaId,
      criado_por: perfil.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect("/video?erro=" + encodeURIComponent("Erro ao criar projeto: " + (error?.message ?? "")));
  }

  revalidatePath("/video");
  redirect(`/video/${data.id}`);
}

export async function excluirProjetoVideo(projetoId: string) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "video")) {
    redirect("/video?erro=" + encodeURIComponent("Sem permissão."));
  }

  await supabase
    .from("projetos_video")
    .delete()
    .eq("id", projetoId)
    .eq("clube_id", perfil.clube_id);

  revalidatePath("/video");
  redirect("/video?aviso=" + encodeURIComponent("Projeto de vídeo excluído."));
}

export async function criarTagVideo(
  projetoId: string,
  payload: {
    categoria: string;
    cor: string;
    tempoInicio: number;
    tempoFim: number;
    atletaNome?: string | null;
    observacao?: string | null;
    desenhoTempo?: number | null;
    desenhoDados?: FormaTelestracao[] | null;
  }
): Promise<TagVideo> {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "video")) {
    throw new Error("Sem permissão para criar tags.");
  }

  const inicio = Math.max(0, Number(payload.tempoInicio.toFixed(2)));
  const fim = Math.max(inicio + 0.5, Number(payload.tempoFim.toFixed(2)));

  const { data, error } = await supabase
    .from("tags_video")
    .insert({
      clube_id: perfil.clube_id,
      projeto_id: projetoId,
      categoria: payload.categoria,
      cor: payload.cor,
      tempo_inicio: inicio,
      tempo_fim: fim,
      atleta_nome: payload.atletaNome?.trim() || null,
      observacao: payload.observacao?.trim() || null,
      desenho_tempo: payload.desenhoTempo ?? null,
      desenho_dados: payload.desenhoDados ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Erro ao criar tag.");
  }

  revalidatePath(`/video/${projetoId}`);
  return data as TagVideo;
}

export async function atualizarTagVideo(
  projetoId: string,
  tagId: string,
  payload: {
    categoria?: string;
    tempoInicio: number;
    tempoFim: number;
    atletaNome?: string | null;
    observacao?: string | null;
    desenhoTempo?: number | null;
    desenhoDados?: FormaTelestracao[] | null;
  }
): Promise<TagVideo> {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "video")) {
    throw new Error("Sem permissão para editar tags.");
  }

  const inicio = Math.max(0, Number(payload.tempoInicio.toFixed(2)));
  const fim = Math.max(inicio + 0.5, Number(payload.tempoFim.toFixed(2)));

  const updateFields: Record<string, any> = {
    tempo_inicio: inicio,
    tempo_fim: fim,
    atleta_nome: payload.atletaNome?.trim() || null,
    observacao: payload.observacao?.trim() || null,
  };
  if (payload.categoria) updateFields.categoria = payload.categoria;
  if (payload.desenhoTempo !== undefined) updateFields.desenho_tempo = payload.desenhoTempo;
  if (payload.desenhoDados !== undefined) updateFields.desenho_dados = payload.desenhoDados;

  const { data, error } = await supabase
    .from("tags_video")
    .update(updateFields)
    .eq("id", tagId)
    .eq("projeto_id", projetoId)
    .eq("clube_id", perfil.clube_id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Erro ao atualizar recorte da tag.");
  }

  revalidatePath(`/video/${projetoId}`);
  return data as TagVideo;
}

export async function excluirTagVideo(projetoId: string, tagId: string) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "video")) {
    throw new Error("Sem permissão para excluir tags.");
  }

  const { error } = await supabase
    .from("tags_video")
    .delete()
    .eq("id", tagId)
    .eq("projeto_id", projetoId)
    .eq("clube_id", perfil.clube_id);

  if (error) throw new Error(error.message);

  revalidatePath(`/video/${projetoId}`);
  return { ok: true };
}

export async function salvarBotoesProjeto(projetoId: string, botoes: BotaoTagging[]) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "video")) {
    throw new Error("Sem permissão.");
  }

  const { error } = await supabase
    .from("projetos_video")
    .update({ botoes_config: botoes })
    .eq("id", projetoId)
    .eq("clube_id", perfil.clube_id);

  if (error) throw new Error(error.message);
  revalidatePath(`/video/${projetoId}`);
  return { ok: true };
}

const OFFSET_FAIXA: Record<string, number> = {
  "0~2": 0,
  "2~4": 120,
  "4~6": 240,
  "6~8": 360,
  "8~10": 480,
};

const COR_RESULTADO: Record<string, string> = {
  gol: "#16a34a",
  fora: "#e11d48",
  defendido: "#d97706",
  turnover: "#9333ea",
  acao_defensiva: "#1e3a8a",
};

export async function importarLancesPartidaParaVideo(
  projetoId: string,
  partidaId: string,
  inicioSet1Seg: number,
  inicioSet2Seg: number | null
): Promise<TagVideo[]> {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "video")) {
    throw new Error("Sem permissão.");
  }

  const { data: acoesRaw } = await supabase
    .from("acoes_partida")
    .select("*")
    .eq("partida_id", partidaId)
    .eq("clube_id", perfil.clube_id)
    .order("criado_em", { ascending: true });

  const acoes = (acoesRaw ?? []) as AcaoPartida[];
  if (acoes.length === 0) {
    throw new Error("Esta partida não possui lances registrados.");
  }

  // Agrupa por (set_numero, faixa_tempo) para distribuir os lances dentro da janela de 2 min
  const grupos = new Map<string, AcaoPartida[]>();
  for (const a of acoes) {
    if (a.set_numero === 2 && inicioSet2Seg === null) continue;
    const key = `${a.set_numero}_${a.faixa_tempo}`;
    const lista = grupos.get(key) ?? [];
    lista.push(a);
    grupos.set(key, lista);
  }

  const paraInserir: any[] = [];
  for (const [key, lista] of grupos.entries()) {
    const [setStr, faixa] = key.split("_");
    const setNum = Number(setStr);
    const baseSet = setNum === 2 && inicioSet2Seg !== null ? inicioSet2Seg : inicioSet1Seg;
    const baseFaixa = OFFSET_FAIXA[faixa] ?? 0;
    const passo = 120 / (lista.length + 1);

    lista.forEach((a, idx) => {
      const centro = Math.max(5, baseSet + baseFaixa + passo * (idx + 1));
      const rotRes = ROTULO_RESULTADO[a.resultado] ?? a.resultado;
      const rotTipo = ROTULO_TIPO[a.tipo] ?? a.tipo;
      paraInserir.push({
        clube_id: perfil.clube_id,
        projeto_id: projetoId,
        categoria: `${rotRes} (${rotTipo})`,
        cor: COR_RESULTADO[a.resultado] ?? "#475569",
        tempo_inicio: Number(Math.max(0, centro - 5).toFixed(1)),
        tempo_fim: Number((centro + 4).toFixed(1)),
        atleta_nome: a.atleta_nome,
        observacao: `${setNum}º Set · ${faixa} min · Placar ${a.placar_nos_momento}×${a.placar_adv_momento}`,
      });
    });
  }

  if (paraInserir.length === 0) {
    throw new Error("Nenhum lance compatível para importar.");
  }

  await supabase
    .from("projetos_video")
    .update({ partida_analise_id: partidaId })
    .eq("id", projetoId)
    .eq("clube_id", perfil.clube_id);

  const { data: inseridas, error } = await supabase
    .from("tags_video")
    .insert(paraInserir)
    .select("*");

  if (error) throw new Error(error.message);

  revalidatePath(`/video/${projetoId}`);
  return (inseridas ?? []) as TagVideo[];
}

export async function alternarCompartilhamentoVideo(projetoId: string, compartilhado: boolean) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "video")) {
    throw new Error("Sem permissão.");
  }

  const { error } = await supabase
    .from("projetos_video")
    .update({ compartilhado_atletas: compartilhado })
    .eq("id", projetoId)
    .eq("clube_id", perfil.clube_id);

  if (error) throw new Error(error.message);
  revalidatePath(`/video/${projetoId}`);
  revalidatePath("/video");
  return { ok: true, compartilhado };
}

export async function enviarTagParaScout(
  projetoId: string,
  payload: {
    equipeAdversariaId: string;
    atletaAdversarioId?: string | null;
    atletaNomeFallback?: string | null;
    tipoFinalizacao: "giro" | "aerea" | "especialista" | "1pt" | "6m";
    zonaCampo?: "lateral_esq" | "meio_esq" | "meio_dir" | "lateral_dir" | null;
    quadranteBaliza?: string | null;
    resultado: "convertido" | "perdido";
    desfechoDetalhe: "gol" | "defesa" | "trave" | "fora";
    observacao?: string | null;
  }
) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "video") && !podeEditar(perfil.papel, "scout")) {
    throw new Error("Sem permissão para registrar no Scout.");
  }

  let atletaId = payload.atletaAdversarioId || null;
  if (!atletaId && payload.atletaNomeFallback?.trim()) {
    const nomeLimpo = payload.atletaNomeFallback.replace(/^#\d+\s*/, "").trim();
    const { data: existente } = await supabase
      .from("atletas_adversarios")
      .select("id")
      .eq("equipe_adversaria_id", payload.equipeAdversariaId)
      .eq("nome", nomeLimpo)
      .maybeSingle();

    if (existente?.id) {
      atletaId = existente.id;
    } else {
      const { data: novo } = await supabase
        .from("atletas_adversarios")
        .insert({
          clube_id: perfil.clube_id,
          equipe_adversaria_id: payload.equipeAdversariaId,
          nome: nomeLimpo,
        })
        .select("id")
        .single();
      atletaId = novo?.id ?? null;
    }
  }

  const { error } = await supabase.from("scout_finalizacoes_adversario").insert({
    clube_id: perfil.clube_id,
    equipe_adversaria_id: payload.equipeAdversariaId,
    atleta_adversario_id: atletaId,
    origem: "jogo",
    tipo_finalizacao: payload.tipoFinalizacao,
    zona_campo: payload.tipoFinalizacao === "6m" ? null : payload.zonaCampo || null,
    quadrante_baliza: payload.quadranteBaliza || null,
    resultado: payload.resultado,
    desfecho_detalhe: payload.desfechoDetalhe,
    observacao: payload.observacao?.trim() || "Enviado via Vídeo & Tagging",
  });

  if (error) throw new Error(error.message);

  revalidatePath("/scout");
  revalidatePath(`/video/${projetoId}`);
  return { ok: true };
}

// ---------- PLAYLISTS PERSONALIZADAS ----------

export async function criarPlaylistVideo(
  projetoId: string,
  nome: string,
  tagIds: string[] = []
): Promise<PlaylistVideo> {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "video")) {
    throw new Error("Sem permissão para criar playlists.");
  }

  const nomeLimpo = nome.trim();
  if (!nomeLimpo) throw new Error("Informe o nome da playlist.");

  const { data, error } = await supabase
    .from("playlists_video")
    .insert({
      clube_id: perfil.clube_id,
      projeto_id: projetoId,
      nome: nomeLimpo,
      tag_ids: tagIds,
      criado_por: perfil.id,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Erro ao criar playlist.");
  revalidatePath(`/video/${projetoId}`);
  return data as PlaylistVideo;
}

export async function atualizarPlaylistVideo(
  projetoId: string,
  playlistId: string,
  tagIds: string[],
  nome?: string
): Promise<PlaylistVideo> {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "video")) {
    throw new Error("Sem permissão para atualizar playlist.");
  }

  const campos: Record<string, any> = { tag_ids: tagIds };
  if (nome?.trim()) campos.nome = nome.trim();

  const { data, error } = await supabase
    .from("playlists_video")
    .update(campos)
    .eq("id", playlistId)
    .eq("projeto_id", projetoId)
    .eq("clube_id", perfil.clube_id)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Erro ao atualizar playlist.");
  revalidatePath(`/video/${projetoId}`);
  return data as PlaylistVideo;
}

export async function excluirPlaylistVideo(projetoId: string, playlistId: string) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "video")) {
    throw new Error("Sem permissão.");
  }

  const { error } = await supabase
    .from("playlists_video")
    .delete()
    .eq("id", playlistId)
    .eq("projeto_id", projetoId)
    .eq("clube_id", perfil.clube_id);

  if (error) throw new Error(error.message);
  revalidatePath(`/video/${projetoId}`);
  return { ok: true };
}
