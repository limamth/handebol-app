import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { exigirModuloAtivo } from "@/lib/configuracoes";
import { carregarCamposCadastro, carregarDadosAtleta } from "@/lib/dados-atletas";
import { FormularioDadosAtleta } from "@/components/dados/FormularioDadosAtleta";
import { Aviso } from "@/components/ui/Aviso";
import { Contact2 } from "lucide-react";

export const metadata = {
  title: "Meus Dados Cadastrais | BH Hub",
};

export default async function PaginaMeusDados({
  searchParams,
}: {
  searchParams: { aviso?: string; erro?: string };
}) {
  await exigirModuloAtivo("dados");
  const { supabase, perfil } = await obterPerfil();

  // Carrega os campos e o registro cadastral do próprio usuário
  const [campos, registro] = await Promise.all([
    carregarCamposCadastro(supabase, perfil.clube_id),
    carregarDadosAtleta(supabase, perfil.clube_id, perfil.id),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Aviso
        key={Date.now()}
        mensagem={searchParams.erro ?? searchParams.aviso}
        tipo={searchParams.erro ? "erro" : "ok"}
      />

      <header className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bola-500 text-white shadow-sm">
          <Contact2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-titulo text-3xl font-bold text-tinta">Meus Dados Cadastrais</h1>
          <p className="text-sm text-suave">
            Mantenha suas informações pessoais, documentos, tamanhos de uniforme e fotos sempre atualizados.
          </p>
        </div>
      </header>

      <FormularioDadosAtleta
        atleta={perfil}
        campos={campos}
        registro={registro}
        podeGerir={false}
        voltarHref="/dashboard"
      />
    </div>
  );
}
