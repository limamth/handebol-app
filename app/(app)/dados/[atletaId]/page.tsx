import { notFound, redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { exigirModuloAtivo } from "@/lib/configuracoes";
import { podeEditar, podeVer } from "@/lib/permissions";
import { carregarCamposCadastro, carregarDadosAtleta } from "@/lib/dados-atletas";
import { FormularioDadosAtleta } from "@/components/dados/FormularioDadosAtleta";
import { Aviso } from "@/components/ui/Aviso";

export const metadata = {
  title: "Ficha Cadastral | BH Hub",
};

export default async function PaginaFichaCadastralAtleta({
  params,
  searchParams,
}: {
  params: { atletaId: string };
  searchParams: { aviso?: string; erro?: string };
}) {
  await exigirModuloAtivo("dados");
  const { supabase, perfil } = await obterPerfil();

  // Atleta só pode abrir a própria ficha
  if (perfil.papel === "atleta" && perfil.id !== params.atletaId) {
    redirect("/dados/meus-dados");
  }

  if (!podeVer(perfil.papel, "dados")) {
    redirect("/dashboard?erro=Sem+acesso+ao+módulo+de+dados");
  }

  const podeGerir = podeEditar(perfil.papel, "dados") && perfil.papel !== "atleta";

  // Busca dados do usuário/atleta
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, nome, papel, ativo, posicao, ano_nascimento")
    .eq("id", params.atletaId)
    .eq("clube_id", perfil.clube_id)
    .single();

  if (!usuario) {
    notFound();
  }

  const [campos, registro] = await Promise.all([
    carregarCamposCadastro(supabase, perfil.clube_id),
    carregarDadosAtleta(supabase, perfil.clube_id, params.atletaId),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Aviso
        key={Date.now()}
        mensagem={searchParams.erro ?? searchParams.aviso}
        tipo={searchParams.erro ? "erro" : "ok"}
      />

      <FormularioDadosAtleta
        atleta={usuario}
        campos={campos}
        registro={registro}
        podeGerir={podeGerir}
        voltarHref="/dados"
      />
    </div>
  );
}
