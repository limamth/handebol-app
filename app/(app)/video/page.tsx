import Link from "next/link";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { exigirModuloAtivo } from "@/lib/configuracoes";
import { podeEditar, podeVer } from "@/lib/permissions";
import { Aviso } from "@/components/ui/Aviso";
import { criarProjetoVideo, excluirProjetoVideo } from "./actions";
import { Film, Play, Plus, Trash2, Youtube, HardDrive } from "lucide-react";

export const metadata = {
  title: "Vídeo & Tagging Esportivo | BH Hub",
};

const campo = "mt-1 w-full rounded-md border border-linha bg-white px-3 py-2 text-sm";

export default async function PaginaVideo({
  searchParams,
}: {
  searchParams: { aviso?: string; erro?: string };
}) {
  await exigirModuloAtivo("video");
  const { supabase, perfil } = await obterPerfil();

  if (!podeVer(perfil.papel, "video")) {
    redirect("/dashboard");
  }

  const editar = podeEditar(perfil.papel, "video");
  const ehAtleta = perfil.papel === "atleta";

  let query = supabase
    .from("projetos_video")
    .select("*, tags_video(count)")
    .eq("clube_id", perfil.clube_id)
    .order("criado_em", { ascending: false });

  if (ehAtleta) {
    query = query.eq("compartilhado_atletas", true);
  }

  const { data: projetos } = await query;

  const lista = (projetos ?? []) as any[];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Aviso
        key={Date.now()}
        mensagem={searchParams.erro ?? searchParams.aviso}
        tipo={searchParams.erro ? "erro" : "ok"}
      />

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-quadra-900 text-white shadow-sm">
            <Film className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-titulo text-3xl font-bold text-tinta">Análise de Vídeo & Tagging</h1>
            <p className="text-sm text-suave">
              Analise jogos quadro a quadro, marque lances com botões de tagging e ajuste os recortes livremente.
            </p>
          </div>
        </div>
      </header>

      {/* Novo Projeto */}
      {editar && (
        <section className="rounded-xl border border-linha bg-white p-5 shadow-sm">
          <details open={lista.length === 0}>
            <summary className="cursor-pointer font-titulo text-lg font-bold text-tinta flex items-center gap-2">
              <Plus className="h-5 w-5 text-bola-500" />
              Nova Análise de Vídeo
            </summary>

            <form action={criarProjetoVideo} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block text-xs font-semibold text-tinta">
                Título da Análise *
                <input
                  name="titulo"
                  required
                  placeholder="Ex.: Brasil x Argentina - 1º Set"
                  className={campo}
                />
              </label>

              <label className="block text-xs font-semibold text-tinta">
                Fonte do Vídeo
                <select name="tipo_fonte" defaultValue="local" className={campo}>
                  <option value="local">Arquivo Local (Computador / Tablet - Offline)</option>
                  <option value="youtube">Link do YouTube (Público / Não-listado)</option>
                </select>
              </label>

              <label className="block text-xs font-semibold text-tinta">
                Link do YouTube (se escolheu YouTube)
                <input
                  name="url_video"
                  placeholder="https://www.youtube.com/watch?v=..."
                  className={campo}
                />
              </label>

              <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between gap-3 pt-1">
                <p className="text-[11px] text-suave">
                  No modo <strong>Arquivo Local</strong>, você escolhe o arquivo <code>.mp4</code> na próxima tela sem gastar internet nem espaço na nuvem.
                </p>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-bola-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                >
                  <Play className="h-4 w-4" />
                  Abrir Estúdio de Vídeo
                </button>
              </div>
            </form>
          </details>
        </section>
      )}

      {/* Lista de Projetos */}
      {lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-linha bg-white p-10 text-center text-sm text-suave">
          Nenhuma análise de vídeo criada ainda. Crie a primeira acima!
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((p) => {
            const totalTags = p.tags_video?.[0]?.count ?? 0;
            const ehYt = p.tipo_fonte === "youtube";

            return (
              <div
                key={p.id}
                className="rounded-xl border border-linha bg-white p-5 shadow-sm flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold ${
                        ehYt ? "bg-rose-50 text-rose-700" : "bg-quadra-50 text-quadra-800"
                      }`}
                    >
                      {ehYt ? <Youtube className="h-3.5 w-3.5" /> : <HardDrive className="h-3.5 w-3.5" />}
                      {ehYt ? "YouTube" : "Arquivo Local"}
                    </span>
                    <span className="text-suave">
                      {new Date(p.criado_em).toLocaleDateString("pt-BR")}
                    </span>
                  </div>

                  <h2 className="mt-3 font-titulo text-lg font-bold text-tinta">{p.titulo}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-suave">{totalTags} corte(s) / tag(s)</p>
                    {p.compartilhado_atletas && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                        Visível p/ Atletas
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-linha pt-3">
                  <Link
                    href={`/video/${p.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-bola-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Abrir Estúdio
                  </Link>

                  {editar && (
                    <form action={excluirProjetoVideo.bind(null, p.id)}>
                      <button
                        type="submit"
                        className="rounded p-1.5 text-suave hover:bg-rose-50 hover:text-rose-600"
                        title="Excluir análise"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
