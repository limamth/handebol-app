import Link from "next/link";
import { notFound } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import { EditorTatico } from "@/components/prancheta/EditorTatico";
import { dadosIniciais, type DadosTaticos } from "@/lib/prancheta";

export default async function EditarJogada({ params }: { params: { id: string } }) {
  const { supabase, perfil } = await obterPerfil();
  const editar = podeEditar(perfil.papel, "prancheta");
  const nova = params.id === "novo";

  let titulo = "";
  let dados: DadosTaticos = dadosIniciais();
  if (!nova) {
    const { data } = await supabase.from("diagramas").select("titulo, dados").eq("id", params.id).single();
    if (!data) notFound();
    titulo = data.titulo;
    dados = data.dados as DadosTaticos;
  } else if (!editar) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link href="/prancheta" className="text-sm text-quadra-600 underline">Voltar para a prancheta</Link>
      <h1 className="font-titulo text-3xl font-bold">{nova ? "Nova jogada" : titulo}</h1>
      <EditorTatico id={nova ? null : params.id} tituloInicial={titulo} dadosIniciais={dados} somenteLeitura={!editar} />
    </div>
  );
}
