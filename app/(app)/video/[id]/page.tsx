import { notFound, redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { exigirModuloAtivo } from "@/lib/configuracoes";
import { podeEditar, podeVer } from "@/lib/permissions";
import { EstudioTaggingVideo } from "@/components/video/EstudioTaggingVideo";
import type { PlaylistVideo, ProjetoVideo, TagVideo } from "@/lib/video-tagging";
import { obterNomeEquipeA, obterNomeEquipeB, type PartidaAnalise } from "@/lib/analise-jogo";

export const metadata = {
  title: "Estúdio de Vídeo & Tagging | BH Hub",
};

export default async function PaginaEstudioVideo({ params }: { params: { id: string } }) {
  await exigirModuloAtivo("video");
  const { supabase, perfil } = await obterPerfil();

  if (!podeVer(perfil.papel, "video")) {
    redirect("/dashboard");
  }

  const [
    { data: projeto },
    { data: tags },
    { data: playlistsRaw },
    { data: partidasRaw },
    { data: equipesScoutRaw },
    { data: apresentacoesRaw },
  ] = await Promise.all([
    supabase
      .from("projetos_video")
      .select("*")
      .eq("id", params.id)
      .eq("clube_id", perfil.clube_id)
      .single(),
    supabase
      .from("tags_video")
      .select("*")
      .eq("projeto_id", params.id)
      .eq("clube_id", perfil.clube_id)
      .order("tempo_inicio", { ascending: true }),
    supabase
      .from("playlists_video")
      .select("*")
      .eq("projeto_id", params.id)
      .eq("clube_id", perfil.clube_id)
      .order("criado_em", { ascending: false }),
    supabase
      .from("partidas_analise")
      .select("*, equipas(id, nome)")
      .eq("clube_id", perfil.clube_id)
      .order("data_partida", { ascending: false })
      .limit(30),
    supabase
      .from("equipes_adversarias")
      .select("id, nome, atletas_adversarios(id, nome, numero)")
      .eq("clube_id", perfil.clube_id)
      .order("nome"),
    supabase
      .from("apresentacoes")
      .select("id, titulo")
      .eq("clube_id", perfil.clube_id)
      .order("atualizado_em", { ascending: false })
      .limit(30),
  ]);

  if (!projeto) notFound();

  if (perfil.papel === "atleta" && !projeto.compartilhado_atletas) {
    redirect("/video?erro=" + encodeURIComponent("Esta análise ainda não foi compartilhada com os atletas."));
  }

  const partidasResumo = ((partidasRaw ?? []) as PartidaAnalise[]).map((p) => ({
    id: p.id,
    rotulo: `${obterNomeEquipeA(p)} vs ${obterNomeEquipeB(p)} (${p.data_partida})`,
  }));

  const equipesScout = ((equipesScoutRaw ?? []) as any[]).map((e) => ({
    id: e.id,
    nome: e.nome,
    atletas: ((e.atletas_adversarios ?? []) as any[]).sort(
      (a, b) => (a.numero ?? 999) - (b.numero ?? 999) || a.nome.localeCompare(b.nome)
    ),
  }));

  return (
    <div className="mx-auto max-w-7xl">
      <EstudioTaggingVideo
        projeto={projeto as ProjetoVideo}
        tagsIniciais={(tags ?? []) as TagVideo[]}
        playlistsIniciais={(playlistsRaw ?? []) as PlaylistVideo[]}
        partidasDisponiveis={partidasResumo}
        equipesScout={equipesScout}
        apresentacoesDisponiveis={(apresentacoesRaw ?? []) as { id: string; titulo: string }[]}
        podeEditar={podeEditar(perfil.papel, "video")}
      />
    </div>
  );
}
