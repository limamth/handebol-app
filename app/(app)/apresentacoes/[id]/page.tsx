import { notFound, redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { exigirModuloAtivo } from "@/lib/configuracoes";
import { podeEditar, podeVer } from "@/lib/permissions";
import { EditorApresentacao } from "@/components/apresentacoes/EditorApresentacao";
import type { Apresentacao, ApresentacaoSlide } from "@/lib/apresentacoes";

export const metadata = {
  title: "Editor de Apresentação | Handebol Hub",
};

export default async function PaginaDetalheApresentacao({ params }: { params: { id: string } }) {
  await exigirModuloAtivo("apresentacoes");
  const { supabase, perfil } = await obterPerfil();

  if (!podeVer(perfil.papel, "apresentacoes")) {
    redirect("/dashboard");
  }

  const [{ data: apresentacao }, { data: slides }, { data: projetosRaw }, { data: playlistsRaw }] =
    await Promise.all([
      supabase
        .from("apresentacoes")
        .select("*")
        .eq("id", params.id)
        .eq("clube_id", perfil.clube_id)
        .single(),
      supabase
        .from("apresentacao_slides")
        .select(
          "*, projeto_video:projetos_video(id, titulo, tipo_fonte, url_video, nome_arquivo), tag_video:tags_video(id, categoria, cor, tempo_inicio, tempo_fim, atleta_nome, observacao, desenho_tempo, desenho_dados)"
        )
        .eq("apresentacao_id", params.id)
        .eq("clube_id", perfil.clube_id)
        .order("ordem", { ascending: true }),
      supabase
        .from("projetos_video")
        .select(
          "id, titulo, tipo_fonte, url_video, nome_arquivo, tags_video(id, categoria, cor, tempo_inicio, tempo_fim, atleta_nome, observacao, desenho_tempo, desenho_dados)"
        )
        .eq("clube_id", perfil.clube_id)
        .order("criado_em", { ascending: false }),
      supabase
        .from("playlists_video")
        .select("id, projeto_id, nome, tag_ids")
        .eq("clube_id", perfil.clube_id)
        .order("criado_em", { ascending: false }),
    ]);

  if (!apresentacao) notFound();

  if (perfil.papel === "atleta" && !apresentacao.compartilhado_atletas) {
    redirect("/apresentacoes?erro=" + encodeURIComponent("Esta apresentação ainda não foi compartilhada."));
  }

  const playlistsPorProjeto = new Map<string, { id: string; nome: string; tag_ids: string[] }[]>();
  for (const pl of (playlistsRaw ?? []) as any[]) {
    const arr = playlistsPorProjeto.get(pl.projeto_id) ?? [];
    arr.push({ id: pl.id, nome: pl.nome, tag_ids: (pl.tag_ids ?? []) as string[] });
    playlistsPorProjeto.set(pl.projeto_id, arr);
  }

  const projetosVideo = ((projetosRaw ?? []) as any[]).map((p) => ({
    id: p.id,
    titulo: p.titulo,
    tipo_fonte: p.tipo_fonte,
    url_video: p.url_video,
    nome_arquivo: p.nome_arquivo,
    tags: ((p.tags_video ?? []) as any[]).sort((a, b) => a.tempo_inicio - b.tempo_inicio),
    playlists: playlistsPorProjeto.get(p.id) ?? [],
  }));

  return (
    <div className="mx-auto max-w-7xl">
      <EditorApresentacao
        apresentacaoInicial={apresentacao as Apresentacao}
        slidesIniciais={(slides ?? []) as ApresentacaoSlide[]}
        projetosVideo={projetosVideo}
        podeEditar={podeEditar(perfil.papel, "apresentacoes")}
      />
    </div>
  );
}
