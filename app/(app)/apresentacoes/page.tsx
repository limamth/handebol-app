import Link from "next/link";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { exigirModuloAtivo } from "@/lib/configuracoes";
import { podeEditar, podeVer } from "@/lib/permissions";
import { Aviso } from "@/components/ui/Aviso";
import { ESTILOS_TEMA, type TemaApresentacao } from "@/lib/apresentacoes";
import { criarApresentacao, excluirApresentacao } from "./actions";
import { Presentation, Plus, Play, Trash2 } from "lucide-react";

export const metadata = {
  title: "Apresentações Táticas | Handebol Hub",
};

const campo = "mt-1 w-full rounded-md border border-linha bg-white px-3 py-2 text-sm";

export default async function PaginaApresentacoes({
  searchParams,
}: {
  searchParams: { aviso?: string; erro?: string };
}) {
  await exigirModuloAtivo("apresentacoes");
  const { supabase, perfil } = await obterPerfil();

  if (!podeVer(perfil.papel, "apresentacoes")) {
    redirect("/dashboard");
  }

  const editar = podeEditar(perfil.papel, "apresentacoes");
  const ehAtleta = perfil.papel === "atleta";

  let query = supabase
    .from("apresentacoes")
    .select("*, apresentacao_slides(count)")
    .eq("clube_id", perfil.clube_id)
    .order("atualizado_em", { ascending: false });

  if (ehAtleta) {
    query = query.eq("compartilhado_atletas", true);
  }

  const { data: apresentacoes } = await query;
  const lista = (apresentacoes ?? []) as any[];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Aviso
        key={Date.now()}
        mensagem={searchParams.erro ?? searchParams.aviso}
        tipo={searchParams.erro ? "erro" : "ok"}
      />

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bola-500 text-white shadow-sm">
            <Presentation className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-titulo text-3xl font-bold text-tinta">Apresentações</h1>
            <p className="text-sm text-suave">
              Apresente direto do Google Drive (online) ou com Cache em PDF (offline) + cortes de vídeo vinculados.
            </p>
          </div>
        </div>
      </header>

      {/* Nova Apresentação */}
      {editar && (
        <section className="rounded-xl border border-linha bg-white p-5 shadow-sm">
          <details open={lista.length === 0}>
            <summary className="cursor-pointer font-titulo text-lg font-bold text-tinta flex items-center gap-2">
              <Plus className="h-5 w-5 text-bola-500" />
              Nova Apresentação
            </summary>

            <form action={criarApresentacao} className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="block text-xs font-semibold text-tinta">
                Título *
                <input
                  name="titulo"
                  required
                  placeholder="Ex.: Preleção Semifinal vs Argentina"
                  className={campo}
                />
              </label>

              <label className="block text-xs font-semibold text-tinta">
                Subtítulo / Descrição
                <input
                  name="descricao"
                  placeholder="Ex.: Pontos fortes, transição e shoot-out"
                  className={campo}
                />
              </label>

              <label className="block text-xs font-semibold text-tinta">
                Link Google Slides / Drive (Online, opcional)
                <input
                  name="google_slides_url"
                  type="url"
                  placeholder="https://docs.google.com/presentation/d/..."
                  className={campo}
                />
              </label>

              <div className="sm:col-span-3 flex items-center justify-between gap-2">
                <p className="text-[11px] text-suave">
                  Depois de criar, você poderá enviar o PDF para cache offline e vincular cortes de vídeo.
                </p>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-bola-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  Criar Apresentação
                </button>
              </div>
            </form>
          </details>
        </section>
      )}

      {/* Lista de Apresentações */}
      {lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-linha bg-white p-10 text-center text-sm text-suave">
          Nenhuma apresentação criada ainda. Crie a primeira acima!
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((a) => {
            const totalSlides = a.apresentacao_slides?.[0]?.count ?? 0;
            const tema = ESTILOS_TEMA[(a.tema as TemaApresentacao) ?? "escuro"] ?? ESTILOS_TEMA.escuro;

            return (
              <div
                key={a.id}
                className="rounded-xl border border-linha bg-white p-5 shadow-sm flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="rounded-full bg-cinza-100 px-2.5 py-0.5 font-semibold text-tinta">
                      {tema.rotulo}
                    </span>
                    <span className="text-suave">
                      {new Date(a.atualizado_em).toLocaleDateString("pt-BR")}
                    </span>
                  </div>

                  <h2 className="mt-3 font-titulo text-lg font-bold text-tinta">{a.titulo}</h2>
                  {a.descricao && <p className="text-xs text-suave mt-1">{a.descricao}</p>}

                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {a.google_slides_url && (
                      <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                        Drive Online
                      </span>
                    )}
                    {a.pdf_storage_path && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        PDF Offline
                      </span>
                    )}
                    <span className="text-xs font-semibold text-quadra-800">
                      {totalSlides} corte(s) de vídeo
                    </span>
                    {a.compartilhado_atletas && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                        Visível p/ Atletas
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-linha pt-3">
                  <Link
                    href={`/apresentacoes/${a.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-bola-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {editar ? "Abrir / Editar" : "Assistir"}
                  </Link>

                  {editar && (
                    <form action={excluirApresentacao.bind(null, a.id)}>
                      <button
                        type="submit"
                        className="rounded p-1.5 text-suave hover:bg-rose-50 hover:text-rose-600"
                        title="Excluir apresentação"
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
