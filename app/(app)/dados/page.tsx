import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { exigirModuloAtivo } from "@/lib/configuracoes";
import { podeEditar, podeVer } from "@/lib/permissions";
import { carregarCamposCadastro, carregarTodosDadosAtletas } from "@/lib/dados-atletas";
import { TabelaCentralDados } from "@/components/dados/TabelaCentralDados";
import { Aviso } from "@/components/ui/Aviso";
import { BotaoImprimir } from "@/components/ui/BotaoImprimir";
import { Contact2, Sparkles, UploadCloud } from "lucide-react";
import { importarPlanilhaCadastro } from "./actions";

export const metadata = {
  title: "Banco de Dados dos Atletas | Handebol Hub",
};

export default async function PaginaDados({
  searchParams,
}: {
  searchParams: { aviso?: string; erro?: string };
}) {
  await exigirModuloAtivo("dados");
  const { supabase, perfil } = await obterPerfil();

  // Atletas só têm acesso aos próprios dados
  if (perfil.papel === "atleta") {
    redirect("/dados/meus-dados");
  }

  // Verifica permissão para a comissão técnica, gestor e diretor
  if (!podeVer(perfil.papel, "dados")) {
    redirect("/dashboard?erro=Sem+acesso+ao+módulo+de+dados");
  }

  const podeGerir = podeEditar(perfil.papel, "dados");

  const [campos, { atletas, cadastros }] = await Promise.all([
    carregarCamposCadastro(supabase, perfil.clube_id),
    carregarTodosDadosAtletas(supabase, perfil.clube_id),
  ]);

  const temCadastrosPreenchidos = Object.keys(cadastros).length > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Aviso
        key={Date.now()}
        mensagem={searchParams.erro ?? searchParams.aviso}
        tipo={searchParams.erro ? "erro" : "ok"}
      />

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bola-500 text-white shadow-sm">
            <Contact2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-titulo text-3xl font-bold text-tinta">Banco de Dados</h1>
            <p className="text-sm text-suave">
              Central de informações cadastrais: documentos, passaportes, viagens, tamanhos de uniforme e contatos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <BotaoImprimir />
        </div>
      </header>

      {/* Banner de Sincronização da Planilha se ainda houver poucos ou nenhum cadastro preenchido */}
      {podeGerir && !temCadastrosPreenchidos && (
        <div className="rounded-xl border border-bola-200 bg-gradient-to-r from-bola-50 via-white to-bola-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bola-500 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-titulo text-base font-bold text-tinta">
                  Planilha CADASTRO_SBMBH27 pronta para sincronização
                </h3>
                <p className="text-xs text-suave">
                  Deseja importar automaticamente os 42 registros (atletas e oficiais) com todos os ~50 campos já preenchidos?
                </p>
              </div>
            </div>

            <form action={importarPlanilhaCadastro}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-bola-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
              >
                <UploadCloud className="h-4 w-4" />
                Importar 42 Registros da Planilha
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tabela Central */}
      <TabelaCentralDados
        atletas={atletas}
        cadastros={cadastros}
        campos={campos}
        podeGerir={podeGerir}
      />
    </div>
  );
}
