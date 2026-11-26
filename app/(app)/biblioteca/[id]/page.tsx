import Link from "next/link";
import { notFound } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import { QuadraEstatica } from "@/components/prancheta/Quadra";
import { COR_OBJETIVO, ROTULO_OBJETIVO } from "@/components/biblioteca/rotulos";
import type { DadosTaticos } from "@/lib/prancheta";
import { excluirExercicio } from "../actions";
import { Aviso } from "@/components/ui/Aviso";

export default async function DetalheExercicio({ params, searchParams }: { params: { id: string }; searchParams: { erro?: string } }) {
  const { supabase, perfil } = await obterPerfil();
  const ehAtleta = perfil.papel === "atleta";
  const { data: e } = await supabase
    .from("exercicios")
    .select("id, titulo, descricao, objetivo, duracao_min, intensidade_alvo, jogadores_min, materiais, tags, pasta, video_url, diagrama_id, diagramas(titulo, dados)")
    .eq("id", params.id).single();
  if (!e) notFound();

  const diagrama = e.diagramas as any as { titulo: string; dados: DadosTaticos } | null;
  const fatos = [
    e.duracao_min && `${e.duracao_min} min`,
    e.intensidade_alvo && `intensidade ${e.intensidade_alvo}/10`,
    e.jogadores_min && `mínimo de ${e.jogadores_min} atletas`,
    !ehAtleta && e.pasta,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Aviso key={Date.now()} mensagem={searchParams.erro} tipo="erro" />
      <Link href="/biblioteca" className="text-sm text-quadra-600 underline">Voltar para exercícios</Link>

      <header>
        <span className={`inline-block rounded px-2 py-0.5 text-xs ${COR_OBJETIVO[e.objetivo]}`}>{ROTULO_OBJETIVO[e.objetivo]}</span>
        <h1 className="mt-2 font-titulo text-3xl font-bold">{e.titulo}</h1>
        {fatos.length > 0 && <p className="text-suave">{fatos.join(" · ")}</p>}
      </header>

      {e.descricao && <p className="whitespace-pre-line rounded-lg border border-linha bg-white p-5">{e.descricao}</p>}

      {diagrama && (
        <section className="rounded-lg border border-linha bg-white p-3">
          <QuadraEstatica frame={diagrama.dados.frames[0]} />
          <p className="mt-2 text-sm">
            <Link href={`/prancheta/${e.diagrama_id}`} className="text-quadra-600 underline">Abrir “{diagrama.titulo}” na prancheta</Link>
          </p>
        </section>
      )}

      {(e.materiais?.length > 0 || (!ehAtleta && e.tags?.length > 0) || e.video_url) && (
        <section className="space-y-1 rounded-lg border border-linha bg-white p-5 text-sm">
          {e.materiais?.length > 0 && <p><strong>Materiais:</strong> {e.materiais.join(", ")}</p>}
          {!ehAtleta && e.tags?.length > 0 && <p><strong>Tags:</strong> {e.tags.join(", ")}</p>}
          {e.video_url && <p><a href={e.video_url} target="_blank" rel="noopener noreferrer" className="text-quadra-600 underline">Ver vídeo</a></p>}
        </section>
      )}

      {podeEditar(perfil.papel, "biblioteca") && (
        <div className="flex items-center gap-4">
          <Link href={`/biblioteca/${e.id}/editar`} className="rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90">Editar exercício</Link>
          <form action={excluirExercicio.bind(null, e.id)}><button className="text-sm text-suave underline">Excluir</button></form>
        </div>
      )}
    </div>
  );
}
