import Link from "next/link";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import { FormularioExercicio } from "@/components/biblioteca/FormularioExercicio";
import { criarExercicio } from "../actions";

export default async function NovoExercicio({ searchParams }: { searchParams: { erro?: string } }) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "biblioteca")) redirect("/biblioteca");
  const { data: jogadas } = await supabase.from("diagramas").select("id, titulo").order("titulo");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/biblioteca" className="text-sm text-quadra-600 underline">Voltar para exercícios</Link>
      <h1 className="font-titulo text-3xl font-bold">Novo exercício</h1>
      {searchParams.erro && <p role="alert" className="rounded-md bg-bola-100 px-3 py-2 text-sm">{searchParams.erro}</p>}
      <FormularioExercicio action={criarExercicio} jogadas={jogadas ?? []} rotuloBotao="Salvar exercício" />
    </div>
  );
}
