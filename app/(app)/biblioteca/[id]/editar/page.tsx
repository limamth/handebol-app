import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import { FormularioExercicio } from "@/components/biblioteca/FormularioExercicio";
import { atualizarExercicio } from "../../actions";

export default async function EditarExercicio({ params, searchParams }: { params: { id: string }; searchParams: { erro?: string } }) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "biblioteca")) redirect(`/biblioteca/${params.id}`);

  const [{ data: e }, { data: jogadas }] = await Promise.all([
    supabase.from("exercicios")
      .select("id, clube_id, titulo, objetivo, pasta, descricao, duracao_min, intensidade_alvo, jogadores_min, materiais, tags, diagrama_id, video_url")
      .eq("id", params.id).single(),
    supabase.from("diagramas").select("id, titulo").order("titulo"),
  ]);
  if (!e) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/biblioteca/${e.id}`} className="text-sm text-quadra-600 underline">Voltar para o exercício</Link>
      <h1 className="font-titulo text-3xl font-bold">Editar exercício</h1>
      {searchParams.erro && <p role="alert" className="rounded-md bg-bola-100 px-3 py-2 text-sm">{searchParams.erro}</p>}

      {e.clube_id ? (
        <FormularioExercicio action={atualizarExercicio.bind(null, e.id)} jogadas={jogadas ?? []} valores={e} rotuloBotao="Salvar alterações" />
      ) : (
        <p className="rounded-lg border border-dashed border-linha bg-white p-6 text-suave">Este exercício é da plataforma e não pode ser editado. Crie uma cópia como novo exercício do seu clube.</p>
      )}
    </div>
  );
}
