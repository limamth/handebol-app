"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import type {
  ApresentacaoSlide,
  SlideEstilo,
  TemaApresentacao,
  TipoSlide,
} from "@/lib/apresentacoes";

export async function criarApresentacao(formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "apresentacoes")) {
    redirect("/apresentacoes?erro=" + encodeURIComponent("Sem permissão para criar apresentações."));
  }

  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const tema = (String(formData.get("tema") ?? "escuro").trim() || "escuro") as TemaApresentacao;
  const googleSlidesUrl = String(formData.get("google_slides_url") ?? "").trim() || null;

  if (!titulo) {
    redirect("/apresentacoes?erro=" + encodeURIComponent("Informe o título da apresentação."));
  }

  const { data: nova, error } = await supabase
    .from("apresentacoes")
    .insert({
      clube_id: perfil.clube_id,
      titulo,
      descricao,
      tema,
      google_slides_url: googleSlidesUrl,
      criado_por: perfil.id,
    })
    .select("id")
    .single();

  if (error || !nova) {
    redirect("/apresentacoes?erro=" + encodeURIComponent("Erro ao criar apresentação: " + (error?.message ?? "")));
  }

  revalidatePath("/apresentacoes");
  redirect(`/apresentacoes/${nova.id}`);
}

export async function excluirApresentacao(id: string) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "apresentacoes")) {
    redirect("/apresentacoes?erro=" + encodeURIComponent("Sem permissão."));
  }

  const { data: ap } = await supabase
    .from("apresentacoes")
    .select("pdf_storage_path")
    .eq("id", id)
    .eq("clube_id", perfil.clube_id)
    .single();

  if (ap?.pdf_storage_path) {
    await supabase.storage.from("apresentacoes").remove([ap.pdf_storage_path]).catch(() => {});
  }

  await supabase
    .from("apresentacoes")
    .delete()
    .eq("id", id)
    .eq("clube_id", perfil.clube_id);

  revalidatePath("/apresentacoes");
  redirect("/apresentacoes?aviso=" + encodeURIComponent("Apresentação excluída."));
}

export async function atualizarMetadadosApresentacao(
  id: string,
  payload: {
    titulo?: string;
    descricao?: string | null;
    tema?: TemaApresentacao;
    compartilhadoAtletas?: boolean;
    googleSlidesUrl?: string | null;
    pdfStoragePath?: string | null;
    pdfNome?: string | null;
    pdfTamanhoBytes?: number | null;
  }
) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "apresentacoes")) {
    throw new Error("Sem permissão.");
  }

  const campos: Record<string, any> = { atualizado_em: new Date().toISOString() };
  if (payload.titulo !== undefined) campos.titulo = payload.titulo.trim();
  if (payload.descricao !== undefined) campos.descricao = payload.descricao;
  if (payload.tema !== undefined) campos.tema = payload.tema;
  if (payload.compartilhadoAtletas !== undefined) campos.compartilhado_atletas = payload.compartilhadoAtletas;
  if (payload.googleSlidesUrl !== undefined) campos.google_slides_url = payload.googleSlidesUrl;
  if (payload.pdfStoragePath !== undefined) campos.pdf_storage_path = payload.pdfStoragePath;
  if (payload.pdfNome !== undefined) campos.pdf_nome = payload.pdfNome;
  if (payload.pdfTamanhoBytes !== undefined) campos.pdf_tamanho_bytes = payload.pdfTamanhoBytes;

  const { error } = await supabase
    .from("apresentacoes")
    .update(campos)
    .eq("id", id)
    .eq("clube_id", perfil.clube_id);

  if (error) throw new Error(error.message);

  revalidatePath("/apresentacoes");
  revalidatePath(`/apresentacoes/${id}`);
  return { ok: true };
}

export async function criarSlide(
  apresentacaoId: string,
  payload: {
    tipo: TipoSlide;
    ordem: number;
    titulo?: string | null;
    subtitulo?: string | null;
    conteudo?: string | null;
    imagemUrl?: string | null;
    projetoVideoId?: string | null;
    tagVideoId?: string | null;
    videoTempoInicio?: number | null;
    videoTempoFim?: number | null;
  }
): Promise<ApresentacaoSlide> {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "apresentacoes")) {
    throw new Error("Sem permissão para editar slides.");
  }

  const { data, error } = await supabase
    .from("apresentacao_slides")
    .insert({
      clube_id: perfil.clube_id,
      apresentacao_id: apresentacaoId,
      ordem: payload.ordem,
      tipo: payload.tipo,
      titulo: payload.titulo ?? null,
      subtitulo: payload.subtitulo ?? null,
      conteudo: payload.conteudo ?? null,
      imagem_url: payload.imagemUrl ?? null,
      projeto_video_id: payload.projetoVideoId ?? null,
      tag_video_id: payload.tagVideoId ?? null,
      video_tempo_inicio: payload.videoTempoInicio ?? null,
      video_tempo_fim: payload.videoTempoFim ?? null,
    })
    .select("*, projeto_video:projetos_video(id, titulo, tipo_fonte, url_video, nome_arquivo), tag_video:tags_video(id, categoria, cor, tempo_inicio, tempo_fim, atleta_nome, observacao, desenho_tempo, desenho_dados)")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Erro ao criar slide.");

  await supabase
    .from("apresentacoes")
    .update({ atualizado_em: new Date().toISOString() })
    .eq("id", apresentacaoId);

  revalidatePath(`/apresentacoes/${apresentacaoId}`);
  return data as ApresentacaoSlide;
}

export async function atualizarSlide(
  apresentacaoId: string,
  slideId: string,
  payload: {
    tipo?: TipoSlide;
    titulo?: string | null;
    subtitulo?: string | null;
    conteudo?: string | null;
    imagemUrl?: string | null;
    projetoVideoId?: string | null;
    tagVideoId?: string | null;
    videoTempoInicio?: number | null;
    videoTempoFim?: number | null;
    estilo?: SlideEstilo | null;
  }
): Promise<ApresentacaoSlide> {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "apresentacoes")) {
    throw new Error("Sem permissão.");
  }

  const campos: Record<string, any> = {};
  if (payload.tipo !== undefined) campos.tipo = payload.tipo;
  if (payload.titulo !== undefined) campos.titulo = payload.titulo;
  if (payload.subtitulo !== undefined) campos.subtitulo = payload.subtitulo;
  if (payload.conteudo !== undefined) campos.conteudo = payload.conteudo;
  if (payload.imagemUrl !== undefined) campos.imagem_url = payload.imagemUrl;
  if (payload.projetoVideoId !== undefined) campos.projeto_video_id = payload.projetoVideoId;
  if (payload.tagVideoId !== undefined) campos.tag_video_id = payload.tagVideoId;
  if (payload.videoTempoInicio !== undefined) campos.video_tempo_inicio = payload.videoTempoInicio;
  if (payload.videoTempoFim !== undefined) campos.video_tempo_fim = payload.videoTempoFim;
  if (payload.estilo !== undefined) campos.estilo = payload.estilo ?? {};

  const { data, error } = await supabase
    .from("apresentacao_slides")
    .update(campos)
    .eq("id", slideId)
    .eq("apresentacao_id", apresentacaoId)
    .eq("clube_id", perfil.clube_id)
    .select("*, projeto_video:projetos_video(id, titulo, tipo_fonte, url_video, nome_arquivo), tag_video:tags_video(id, categoria, cor, tempo_inicio, tempo_fim, atleta_nome, observacao, desenho_tempo, desenho_dados)")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Erro ao atualizar slide.");

  await supabase
    .from("apresentacoes")
    .update({ atualizado_em: new Date().toISOString() })
    .eq("id", apresentacaoId);

  revalidatePath(`/apresentacoes/${apresentacaoId}`);
  return data as ApresentacaoSlide;
}

export async function reordenarSlides(apresentacaoId: string, slideIdsOrdenados: string[]) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "apresentacoes")) {
    throw new Error("Sem permissão.");
  }

  for (let i = 0; i < slideIdsOrdenados.length; i++) {
    await supabase
      .from("apresentacao_slides")
      .update({ ordem: i })
      .eq("id", slideIdsOrdenados[i])
      .eq("apresentacao_id", apresentacaoId)
      .eq("clube_id", perfil.clube_id);
  }

  revalidatePath(`/apresentacoes/${apresentacaoId}`);
  return { ok: true };
}

export async function excluirSlide(apresentacaoId: string, slideId: string) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "apresentacoes")) {
    throw new Error("Sem permissão.");
  }

  const { error } = await supabase
    .from("apresentacao_slides")
    .delete()
    .eq("id", slideId)
    .eq("apresentacao_id", apresentacaoId)
    .eq("clube_id", perfil.clube_id);

  if (error) throw new Error(error.message);

  revalidatePath(`/apresentacoes/${apresentacaoId}`);
  return { ok: true };
}

/**
 * Chamado direto do Estúdio de Vídeo (/video/[id]) para adicionar um corte à apresentação
 */
export async function adicionarCorteEmApresentacao(payload: {
  apresentacaoId?: string | null;
  novaApresentacaoTitulo?: string | null;
  projetoVideoId: string;
  tagVideoId: string;
  tituloSlide: string;
  conteudo?: string | null;
  tempoInicio: number;
  tempoFim: number;
}) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "apresentacoes") && !podeEditar(perfil.papel, "video")) {
    throw new Error("Sem permissão.");
  }

  let targetId = payload.apresentacaoId || null;

  if (!targetId) {
    const novoTitulo = payload.novaApresentacaoTitulo?.trim() || "Apresentação Tática";
    const { data: novaAp, error: errAp } = await supabase
      .from("apresentacoes")
      .insert({
        clube_id: perfil.clube_id,
        titulo: novoTitulo,
        tema: "escuro",
        criado_por: perfil.id,
      })
      .select("id")
      .single();

    if (errAp || !novaAp) throw new Error(errAp?.message ?? "Erro ao criar apresentação.");
    targetId = novaAp.id;

    // Slide de capa automático
    await supabase.from("apresentacao_slides").insert({
      clube_id: perfil.clube_id,
      apresentacao_id: targetId,
      ordem: 0,
      tipo: "capa",
      titulo: novoTitulo,
      subtitulo: "Análise em Vídeo",
    });
  }

  const { data: ultimos } = await supabase
    .from("apresentacao_slides")
    .select("ordem")
    .eq("apresentacao_id", targetId)
    .order("ordem", { ascending: false })
    .limit(1);

  const proximaOrdem = (ultimos?.[0]?.ordem ?? 0) + 1;

  const { error } = await supabase.from("apresentacao_slides").insert({
    clube_id: perfil.clube_id,
    apresentacao_id: targetId,
    ordem: proximaOrdem,
    tipo: "video_corte",
    titulo: payload.tituloSlide.trim() || "Lance em Vídeo",
    conteudo: payload.conteudo?.trim() || null,
    projeto_video_id: payload.projetoVideoId,
    tag_video_id: payload.tagVideoId,
    video_tempo_inicio: payload.tempoInicio,
    video_tempo_fim: payload.tempoFim,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/apresentacoes");
  revalidatePath(`/apresentacoes/${targetId}`);
  return { apresentacaoId: targetId };
}

/**
 * Adiciona todos os cortes de uma Playlist de Vídeo como slides sequenciais em uma Apresentação
 */
export async function adicionarPlaylistEmApresentacao(payload: {
  apresentacaoId?: string | null;
  novaApresentacaoTitulo?: string | null;
  projetoVideoId: string;
  playlistId: string;
  incluirCapaPlaylist?: boolean;
}): Promise<{ apresentacaoId: string; slidesCriados: ApresentacaoSlide[] }> {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "apresentacoes") && !podeEditar(perfil.papel, "video")) {
    throw new Error("Sem permissão.");
  }

  const [{ data: playlist, error: errPl }, { data: tagsRaw }] = await Promise.all([
    supabase
      .from("playlists_video")
      .select("id, nome, tag_ids")
      .eq("id", payload.playlistId)
      .eq("projeto_id", payload.projetoVideoId)
      .eq("clube_id", perfil.clube_id)
      .single(),
    supabase
      .from("tags_video")
      .select("id, categoria, cor, tempo_inicio, tempo_fim, atleta_nome, observacao")
      .eq("projeto_id", payload.projetoVideoId)
      .eq("clube_id", perfil.clube_id),
  ]);

  if (errPl || !playlist) {
    throw new Error("Playlist não encontrada.");
  }

  const tagIds = (playlist.tag_ids ?? []) as string[];
  const tagsMap = new Map((tagsRaw ?? []).map((t: any) => [t.id, t]));
  const tagsDaPlaylist = tagIds
    .map((id) => tagsMap.get(id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  if (tagsDaPlaylist.length === 0) {
    throw new Error("Esta playlist não possui cortes válidos para adicionar.");
  }

  let targetId = payload.apresentacaoId || null;

  if (!targetId) {
    const novoTitulo = payload.novaApresentacaoTitulo?.trim() || playlist.nome || "Apresentação Tática";
    const { data: novaAp, error: errAp } = await supabase
      .from("apresentacoes")
      .insert({
        clube_id: perfil.clube_id,
        titulo: novoTitulo,
        tema: "escuro",
        criado_por: perfil.id,
      })
      .select("id")
      .single();

    if (errAp || !novaAp) throw new Error(errAp?.message ?? "Erro ao criar apresentação.");
    targetId = novaAp.id;

    await supabase.from("apresentacao_slides").insert({
      clube_id: perfil.clube_id,
      apresentacao_id: targetId,
      ordem: 0,
      tipo: "capa",
      titulo: novoTitulo,
      subtitulo: `Playlist: ${playlist.nome}`,
    });
  }

  const { data: ultimos } = await supabase
    .from("apresentacao_slides")
    .select("ordem")
    .eq("apresentacao_id", targetId)
    .order("ordem", { ascending: false })
    .limit(1);

  let ordemAtual = (ultimos?.[0]?.ordem ?? -1) + 1;
  const inserts: Record<string, any>[] = [];

  if (payload.incluirCapaPlaylist && payload.apresentacaoId) {
    inserts.push({
      clube_id: perfil.clube_id,
      apresentacao_id: targetId,
      ordem: ordemAtual++,
      tipo: "capa",
      titulo: playlist.nome,
      subtitulo: `${tagsDaPlaylist.length} corte(s) de vídeo`,
    });
  }

  for (const t of tagsDaPlaylist) {
    inserts.push({
      clube_id: perfil.clube_id,
      apresentacao_id: targetId,
      ordem: ordemAtual++,
      tipo: "video_corte",
      titulo: `${t.categoria}${t.atleta_nome ? ` — ${t.atleta_nome}` : ""}`,
      conteudo: t.observacao?.trim() || null,
      projeto_video_id: payload.projetoVideoId,
      tag_video_id: t.id,
      video_tempo_inicio: t.tempo_inicio,
      video_tempo_fim: t.tempo_fim,
    });
  }

  const { data: criados, error: errIns } = await supabase
    .from("apresentacao_slides")
    .insert(inserts)
    .select(
      "*, projeto_video:projetos_video(id, titulo, tipo_fonte, url_video, nome_arquivo), tag_video:tags_video(id, categoria, cor, tempo_inicio, tempo_fim, atleta_nome, observacao, desenho_tempo, desenho_dados)"
    );

  if (errIns) throw new Error(errIns.message);

  await supabase
    .from("apresentacoes")
    .update({ atualizado_em: new Date().toISOString() })
    .eq("id", targetId);

  revalidatePath("/apresentacoes");
  revalidatePath(`/apresentacoes/${targetId}`);
  return {
    apresentacaoId: targetId!,
    slidesCriados: (criados ?? []) as ApresentacaoSlide[],
  };
}
